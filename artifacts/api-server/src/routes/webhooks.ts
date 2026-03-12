import { Router, type IRouter } from "express";
import { db, usersTable, webhookLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const PLAN_CREDITS: Record<string, { credits: number; plan: string }> = {
  starter: { credits: 60, plan: "starter" },
  pro: { credits: 200, plan: "pro" },
  agency: { credits: 600, plan: "agency" },
};

function verifyPaddleWebhook(body: Record<string, any>, publicKey: string): boolean {
  try {
    const signature = body.p_signature;
    if (!signature) return false;

    const params = Object.keys(body)
      .filter(k => k !== "p_signature")
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = body[key];
        return acc;
      }, {});

    const serialized = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const verify = crypto.createVerify("SHA1");
    verify.update(serialized);
    return verify.verify(publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

router.post("/webhooks/paddle", async (req, res): Promise<void> => {
  const body = req.body;
  const publicKey = process.env.PADDLE_PUBLIC_KEY || "";

  if (publicKey && !verifyPaddleWebhook(body, publicKey)) {
    await db.insert(webhookLogsTable).values({
      eventType: body.alert_name || "unknown",
      payload: JSON.stringify(body),
      status: "failed_verification",
    });
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const eventType = body.alert_name || body.event_type || "unknown";

  await db.insert(webhookLogsTable).values({
    eventType,
    payload: JSON.stringify(body),
    status: "processing",
  });

  try {
    if (eventType === "subscription_created" || eventType === "subscription_payment_succeeded") {
      let passthrough: any = {};
      try {
        passthrough = JSON.parse(body.passthrough || "{}");
      } catch {}

      const userId = passthrough.userId;
      const planId = passthrough.planId || body.subscription_plan_id;

      if (userId) {
        const planInfo = PLAN_CREDITS[planId] || PLAN_CREDITS.starter;
        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);

        await db.update(usersTable)
          .set({
            plan: planInfo.plan,
            creditsRemaining: planInfo.credits,
            creditsTotal: planInfo.credits,
            subscriptionStatus: "active",
            subscriptionId: body.subscription_id || null,
            creditsResetAt: resetAt,
          })
          .where(eq(usersTable.id, userId));
      }
    } else if (eventType === "subscription_cancelled") {
      const subscriptionId = body.subscription_id;
      if (subscriptionId) {
        await db.update(usersTable)
          .set({ subscriptionStatus: "cancelled" })
          .where(eq(usersTable.subscriptionId, subscriptionId));
      }
    } else if (eventType === "subscription_payment_failed") {
      const subscriptionId = body.subscription_id;
      if (subscriptionId) {
        await db.update(usersTable)
          .set({ subscriptionStatus: "payment_failed" })
          .where(eq(usersTable.subscriptionId, subscriptionId));
      }
    }

    await db.update(webhookLogsTable)
      .set({ status: "processed" })
      .where(eq(webhookLogsTable.eventType, eventType));

    res.json({ message: "Webhook processed" });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
