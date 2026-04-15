export {};
import { Router, type IRouter } from "express";
import { db, usersTable, feedbackTable, webhookLogsTable, adminSettingsTable, generationJobsTable } from "@workspace/db";
import { eq, or, count, ilike } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import {
  AdminGetUsersQueryParams,
  AdminAdjustCreditsBody,
  AdminUpdateSettingsBody,
  AdminGetUsersResponse,
  AdminAdjustCreditsResponse,
  AdminGetFeedbackResponse,
  AdminGetSettingsResponse,
  AdminUpdateSettingsResponse,
  AdminGetWebhookLogsResponse,
  AdminGetStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminGetUsersQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page || 1) : 1;
  const limit = params.success ? (params.data.limit || 20) : 20;
  const search = params.success ? params.data.search : undefined;
  const offset = (page - 1) * limit;

  let users;
  if (search) {
    users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
      plan: usersTable.plan,
      creditsRemaining: usersTable.creditsRemaining,
      subscriptionStatus: usersTable.subscriptionStatus,
      createdAt: usersTable.createdAt,
    })
      .from(usersTable)
      .where(or(
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.fullName, `%${search}%`)
      ))
      .limit(limit)
      .offset(offset);
  } else {
    users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
      plan: usersTable.plan,
      creditsRemaining: usersTable.creditsRemaining,
      subscriptionStatus: usersTable.subscriptionStatus,
      createdAt: usersTable.createdAt,
    })
      .from(usersTable)
      .limit(limit)
      .offset(offset);
  }

  const [totalResult] = await db.select({ count: count() }).from(usersTable);

  res.json(AdminGetUsersResponse.parse({
    users,
    total: totalResult.count,
    page,
    limit,
  }));
});

router.patch("/admin/users/:id/credits", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const parsed = AdminAdjustCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newCredits = Math.max(0, user.creditsRemaining + parsed.data.credits);
  await db.update(usersTable).set({ creditsRemaining: newCredits }).where(eq(usersTable.id, id));

  res.json(AdminAdjustCreditsResponse.parse({ message: `Credits adjusted. New balance: ${newCredits}` }));
});

router.get("/admin/feedback", requireAdmin, async (req, res): Promise<void> => {
  const feedbackWithUsers = await db
    .select({
      id: feedbackTable.id,
      userId: feedbackTable.userId,
      userEmail: usersTable.email,
      subject: feedbackTable.subject,
      message: feedbackTable.message,
      type: feedbackTable.type,
      createdAt: feedbackTable.createdAt,
    })
    .from(feedbackTable)
    .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
    .orderBy(feedbackTable.createdAt);

  const normalized = feedbackWithUsers.map(f => ({
    ...f,
    userEmail: f.userEmail || "unknown@email.com",
  }));

  res.json(AdminGetFeedbackResponse.parse({ feedback: normalized }));
});

router.get("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const settings = await db.select().from(adminSettingsTable);
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  res.json(AdminGetSettingsResponse.parse({
    modelProvider: settingsMap.model_provider || process.env.MODEL_PROVIDER || "groq",
    aiModelName: settingsMap.ai_model_name || process.env.AI_MODEL_NAME || "llama-3.1-70b-versatile",
    starterProvider: settingsMap.starter_provider || "groq",
    proProvider: settingsMap.pro_provider || "groq",
    agencyProvider: settingsMap.agency_provider || "groq",
  }));
});

router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminUpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settingEntries: Array<{ key: string; value: string }> = [];
  if (parsed.data.modelProvider) settingEntries.push({ key: "model_provider", value: parsed.data.modelProvider });
  if (parsed.data.aiModelName) settingEntries.push({ key: "ai_model_name", value: parsed.data.aiModelName });
  if (parsed.data.starterProvider) settingEntries.push({ key: "starter_provider", value: parsed.data.starterProvider });
  if (parsed.data.proProvider) settingEntries.push({ key: "pro_provider", value: parsed.data.proProvider });
  if (parsed.data.agencyProvider) settingEntries.push({ key: "agency_provider", value: parsed.data.agencyProvider });

  for (const entry of settingEntries) {
    await db.insert(adminSettingsTable)
      .values(entry)
      .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: entry.value } });
  }

  const settings = await db.select().from(adminSettingsTable);
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  res.json(AdminUpdateSettingsResponse.parse({
    modelProvider: settingsMap.model_provider || "groq",
    aiModelName: settingsMap.ai_model_name || "llama-3.1-70b-versatile",
    starterProvider: settingsMap.starter_provider || "groq",
    proProvider: settingsMap.pro_provider || "groq",
    agencyProvider: settingsMap.agency_provider || "groq",
  }));
});

router.get("/admin/webhooks", requireAdmin, async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(webhookLogsTable)
    .orderBy(webhookLogsTable.createdAt)
    .limit(100);

  res.json(AdminGetWebhookLogsResponse.parse({ logs }));
});

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
  const [activeSubsResult] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.subscriptionStatus, "active"));
  const [totalJobsResult] = await db.select({ count: count() }).from(generationJobsTable);

  const allUsers = await db.select({ plan: usersTable.plan }).from(usersTable);
  const usersByPlan = allUsers.reduce((acc: Record<string, number>, u) => {
    acc[u.plan] = (acc[u.plan] || 0) + 1;
    return acc;
  }, {});

  const allJobs = await db.select({ creditsUsed: generationJobsTable.creditsUsed }).from(generationJobsTable);
  const totalCreditsUsed = allJobs.reduce((sum, j) => sum + j.creditsUsed, 0);

  res.json(AdminGetStatsResponse.parse({
    totalUsers: totalUsersResult.count,
    activeSubscriptions: activeSubsResult.count,
    totalGenerations: totalJobsResult.count,
    totalCreditsUsed,
    usersByPlan,
  }));
});

export default router;
