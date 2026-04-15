import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, hashPassword, comparePasswords } from "../lib/auth.js";
import {
  UpdateProfileBody,
  ChangePasswordBody,
  UpdateProfileResponse,
  ChangePasswordResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    plan: user.plan,
    creditsRemaining: user.creditsRemaining,
    creditsTotal: user.creditsTotal,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionId: user.subscriptionId,
    createdAt: user.createdAt,
  };
}

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.fullName) updates.fullName = parsed.data.fullName;
  if (parsed.data.email) updates.email = parsed.data.email.toLowerCase();

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();

  res.json(UpdateProfileResponse.parse(formatUser(updated)));
});

router.post("/user/change-password", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const valid = await comparePasswords(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  res.json(ChangePasswordResponse.parse({ message: "Password changed successfully" }));
});

export default router;
