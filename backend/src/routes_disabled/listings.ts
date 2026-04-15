import { Router, type IRouter } from "express";
import { db, usersTable, generationJobsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { generateListingDescription } from "../lib/ai.js";
import {
  GenerateListingsBody,
  GetGenerationHistoryQueryParams,
  StartBatchBody,
  GenerateRowBody,
  FinishBatchBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Shared sanitizer ─────────────────────────────────────────────────────────
function sanitizeInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now/i,
    /act as/i,
    /disregard/i,
    /forget everything/i,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(value)) return "[removed]";
  }
  return value.slice(0, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW BATCH FLOW
// ─────────────────────────────────────────────────────────────────────────────

// 1. Start batch: atomic credit deduction + create "processing" record
router.post("/listings/batches/start", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  if (user.subscriptionStatus !== "active") {
    res.status(403).json({ error: "An active subscription is required to generate listings." });
    return;
  }

  const body = StartBatchBody.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { totalRows, outputMode } = body.data;

  let creditsRemaining: number;
  try {
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ creditsRemaining: usersTable.creditsRemaining })
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .for("update");

      if (!locked) throw new Error("USER_NOT_FOUND");
      if (locked.creditsRemaining < totalRows) throw new Error("INSUFFICIENT_CREDITS");

      const [updated] = await tx
        .update(usersTable)
        .set({ creditsRemaining: sql`credits_remaining - ${totalRows}` })
        .where(eq(usersTable.id, user.id))
        .returning({ creditsRemaining: usersTable.creditsRemaining });

      return updated.creditsRemaining;
    });
    creditsRemaining = result;
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_CREDITS") {
      res.status(402).json({
        error: `Not enough credits. You need ${totalRows} but only have ${user.creditsRemaining}.`,
      });
      return;
    }
    if (err.message === "USER_NOT_FOUND") {
      res.status(401).json({ error: "User not found." });
      return;
    }
    console.error("Credit deduction error:", err);
    res.status(500).json({ error: "Failed to process credits." });
    return;
  }

  const [job] = await db
    .insert(generationJobsTable)
    .values({
      userId: user.id,
      outputMode,
      listingCount: totalRows,
      creditsUsed: 0,
      succeededCount: 0,
      failedCount: 0,
      status: "processing",
      results: [],
    })
    .returning();

  res.json({ batchId: job.id, creditsRemaining });
});

// 2. Generate one row: pure AI generation, no credit/job logic
router.post("/listings/generate-row", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  if (user.subscriptionStatus !== "active") {
    res.status(403).json({ error: "An active subscription is required to generate listings." });
    return;
  }

  const body = GenerateRowBody.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { property, outputMode, includeSocialCaption } = body.data;

  const sanitized = {
    propertyTitle: sanitizeInput(property.propertyTitle),
    propertyType: sanitizeInput(property.propertyType),
    bedrooms: sanitizeInput(property.bedrooms),
    bathrooms: sanitizeInput(property.bathrooms),
    areaSqft: sanitizeInput(property.areaSqft),
    location: sanitizeInput(property.location),
    price: sanitizeInput(property.price),
    amenities: sanitizeInput(property.amenities),
    nearbyLandmarks: sanitizeInput(property.nearbyLandmarks),
  };

  try {
    const generated = await generateListingDescription(
      sanitized,
      outputMode,
      includeSocialCaption || false,
      user.plan
    );
    res.json({ listing: { ...generated, failed: false } });
  } catch (err) {
    console.error("AI generation error for property:", property.propertyTitle, err);
    res.json({
      listing: {
        propertyTitle: property.propertyTitle || "Unknown Property",
        longDescription: "Description generation failed. Please try again.",
        shortDescription: "Generation failed.",
        socialCaption: null,
        failed: true,
      },
    });
  }
});

// 3. Finish batch: save all results, refund failed credits, mark completed
router.patch("/listings/batches/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const rawId = req.params.id as string;
  const batchId = parseInt(rawId, 10);

  if (isNaN(batchId)) {
    res.status(400).json({ error: "Invalid batch ID" });
    return;
  }

  const body = FinishBatchBody.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { results, succeeded, failed, creditsUsed } = body.data;

  // Refund credits for rows that failed (they were pre-deducted)
  if (failed > 0) {
    await db
      .update(usersTable)
      .set({ creditsRemaining: sql`credits_remaining + ${failed}` })
      .where(eq(usersTable.id, user.id));
  }

  await db
    .update(generationJobsTable)
    .set({
      results,
      succeededCount: succeeded,
      failedCount: failed,
      creditsUsed,
      status: "completed",
    })
    .where(eq(generationJobsTable.id, batchId));

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY BULK ENDPOINT (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/listings/generate", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  if (user.subscriptionStatus !== "active") {
    res.status(403).json({ error: "An active subscription is required to generate listings." });
    return;
  }

  const parsed = GenerateListingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { properties, outputMode, includeSocialCaption } = parsed.data;
  const creditsNeeded = properties.length;

  let creditsAfterDeduction: number;
  try {
    const result = await db.transaction(async (tx) => {
      const [lockedUser] = await tx
        .select({ creditsRemaining: usersTable.creditsRemaining })
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .for("update");

      if (!lockedUser) throw new Error("USER_NOT_FOUND");
      if (lockedUser.creditsRemaining < creditsNeeded) throw new Error("INSUFFICIENT_CREDITS");

      const [updated] = await tx
        .update(usersTable)
        .set({ creditsRemaining: sql`credits_remaining - ${creditsNeeded}` })
        .where(eq(usersTable.id, user.id))
        .returning({ creditsRemaining: usersTable.creditsRemaining });

      return updated.creditsRemaining;
    });
    creditsAfterDeduction = result;
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_CREDITS") {
      res.status(402).json({
        error: `Not enough credits to process this file. You need ${creditsNeeded} credits but have ${user.creditsRemaining}.`,
      });
      return;
    }
    if (err.message === "USER_NOT_FOUND") {
      res.status(401).json({ error: "User not found." });
      return;
    }
    res.status(500).json({ error: "Failed to process credits. Please try again." });
    return;
  }

  const listings = [];
  let succeeded = 0;
  let failed = 0;

  for (const property of properties) {
    const sanitized = {
      propertyTitle: sanitizeInput(property.propertyTitle),
      propertyType: sanitizeInput(property.propertyType),
      bedrooms: sanitizeInput(property.bedrooms),
      bathrooms: sanitizeInput(property.bathrooms),
      areaSqft: sanitizeInput(property.areaSqft),
      location: sanitizeInput(property.location),
      price: sanitizeInput(property.price),
      amenities: sanitizeInput(property.amenities),
      nearbyLandmarks: sanitizeInput(property.nearbyLandmarks),
    };

    try {
      const generated = await generateListingDescription(sanitized, outputMode, includeSocialCaption || false, user.plan);
      listings.push({ ...generated, failed: false });
      succeeded++;
    } catch (err) {
      console.error("AI generation error for property:", property.propertyTitle, err);
      listings.push({
        propertyTitle: property.propertyTitle || "Unknown Property",
        longDescription: "Description generation failed. Please try again.",
        shortDescription: "Generation failed.",
        socialCaption: null,
        failed: true,
      });
      failed++;
    }
  }

  let finalCreditsRemaining = creditsAfterDeduction;
  if (failed > 0) {
    const [refunded] = await db
      .update(usersTable)
      .set({ creditsRemaining: sql`credits_remaining + ${failed}` })
      .where(eq(usersTable.id, user.id))
      .returning({ creditsRemaining: usersTable.creditsRemaining });
    finalCreditsRemaining = refunded.creditsRemaining;
  }

  const creditsUsed = succeeded;

  const [job] = await db.insert(generationJobsTable).values({
    userId: user.id,
    outputMode,
    listingCount: properties.length,
    creditsUsed,
    succeededCount: succeeded,
    failedCount: failed,
    status: "completed",
    results: listings,
  }).returning();

  res.json({
    jobId: job.id,
    listings,
    creditsUsed,
    creditsRemaining: finalCreditsRemaining,
    succeeded,
    failed,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────

router.get("/listings/history", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = GetGenerationHistoryQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page || 1) : 1;
  const limit = params.success ? (params.data.limit || 10) : 10;
  const offset = (page - 1) * limit;

  const jobs = await db
    .select({
      id: generationJobsTable.id,
      outputMode: generationJobsTable.outputMode,
      listingCount: generationJobsTable.listingCount,
      creditsUsed: generationJobsTable.creditsUsed,
      succeededCount: generationJobsTable.succeededCount,
      failedCount: generationJobsTable.failedCount,
      status: generationJobsTable.status,
      createdAt: generationJobsTable.createdAt,
    })
    .from(generationJobsTable)
    .where(eq(generationJobsTable.userId, user.id))
    .orderBy(desc(generationJobsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(generationJobsTable)
    .where(eq(generationJobsTable.userId, user.id));

  res.json({
    jobs,
    total: totalResult.count,
    page,
    limit,
  });
});

router.get("/listings/history/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [job] = await db
    .select()
    .from(generationJobsTable)
    .where(eq(generationJobsTable.id, id));

  if (!job || (job.userId !== user.id && user.role !== "admin")) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    id: job.id,
    outputMode: job.outputMode,
    listingCount: job.listingCount,
    creditsUsed: job.creditsUsed,
    succeededCount: job.succeededCount,
    failedCount: job.failedCount,
    status: job.status,
    createdAt: job.createdAt,
    listings: job.results,
  });
});

export default router;
