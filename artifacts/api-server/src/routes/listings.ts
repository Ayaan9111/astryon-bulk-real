import { Router, type IRouter } from "express";
import { db, usersTable, generationJobsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { generateListingDescription } from "../lib/ai.js";
import {
  GenerateListingsBody,
  GetGenerationHistoryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/listings/generate", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const parsed = GenerateListingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { properties, outputMode, includeSocialCaption } = parsed.data;
  const creditsNeeded = properties.length;

  // ── Phase 1: Atomic credit check + pre-deduction ────────────────────────────
  // Use a transaction with a row-level lock (FOR UPDATE) to prevent race
  // conditions. Credits cannot go negative because the check and deduction
  // happen inside the same serialized transaction.
  let creditsAfterDeduction: number;
  try {
    const result = await db.transaction(async (tx) => {
      // Lock this user's row so no concurrent request can read/write it
      const [lockedUser] = await tx
        .select({ creditsRemaining: usersTable.creditsRemaining })
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .for("update");

      if (!lockedUser) throw new Error("USER_NOT_FOUND");
      if (lockedUser.creditsRemaining < creditsNeeded) throw new Error("INSUFFICIENT_CREDITS");

      // Deduct atomically using SQL expression (not stale JS value)
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
    console.error("Credit deduction error:", err);
    res.status(500).json({ error: "Failed to process credits. Please try again." });
    return;
  }

  // ── Phase 2: Generation loop ─────────────────────────────────────────────────
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
      const generated = await generateListingDescription(
        sanitized,
        outputMode,
        includeSocialCaption || false,
        user.plan
      );
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

  // ── Phase 3: Refund credits for failed rows ──────────────────────────────────
  // Only charge for rows that actually succeeded. Failed rows are refunded
  // using an atomic increment to avoid stale-read issues.
  let finalCreditsRemaining = creditsAfterDeduction;
  if (failed > 0) {
    const [refunded] = await db
      .update(usersTable)
      .set({ creditsRemaining: sql`credits_remaining + ${failed}` })
      .where(eq(usersTable.id, user.id))
      .returning({ creditsRemaining: usersTable.creditsRemaining });
    finalCreditsRemaining = refunded.creditsRemaining;
  }

  const creditsUsed = succeeded; // Only succeeded rows are charged

  // ── Phase 4: Persist the job record ──────────────────────────────────────────
  const [job] = await db.insert(generationJobsTable).values({
    userId: user.id,
    outputMode,
    listingCount: properties.length,
    creditsUsed,
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
    createdAt: job.createdAt,
    listings: job.results,
  });
});

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

export default router;
