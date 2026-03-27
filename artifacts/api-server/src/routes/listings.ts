import { Router, type IRouter } from "express";
import { db, usersTable, generationJobsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
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

  if (user.creditsRemaining < creditsNeeded) {
    res.status(402).json({ error: `Insufficient credits. You need ${creditsNeeded} credits but have ${user.creditsRemaining}.` });
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

  const newCredits = user.creditsRemaining - creditsNeeded;
  await db.update(usersTable).set({ creditsRemaining: newCredits }).where(eq(usersTable.id, user.id));

  const [job] = await db.insert(generationJobsTable).values({
    userId: user.id,
    outputMode,
    listingCount: properties.length,
    creditsUsed: creditsNeeded,
    results: listings,
  }).returning();

  res.json({
    jobId: job.id,
    listings,
    creditsUsed: creditsNeeded,
    creditsRemaining: newCredits,
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
