import { Router, type IRouter } from "express";
import { db, usersTable, webhookLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const STARTER_PRICE_ID = process.env.PADDLE_PRODUCT_STARTER || "";
const PRO_PRICE_ID = process.env.PADDLE_PRODUCT_PRO || "";
const AGENCY_PRICE_ID = process.env.PADDLE_PRODUCT_AGENCY || "";

const PRICE_MAP: Record<string, { plan: string; credits: number }> = {
  [STARTER_PRICE_ID]: { plan: "starter", credits: 60 },
  [PRO_PRICE_ID]: { plan: "pro", credits: 200 },
  [AGENCY_PRICE_ID]: { plan: "agency", credits: 600 },
};

function verifyPaddleSignature(rawBody: Buffer, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(";").map(p => p.split("=")));
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signed = `${ts}:${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1));
}

function extractFromEvent(data: Record<string, any>): { email: string | null; priceId: string | null } {
  const email =
    data?.customer?.email ||
    data?.address?.customer?.email ||
    null;

  const priceId =
    data?.items?.[0]?.price?.id ||
    data?.items?.[0]?.price_id ||
    data?.details?.line_items?.[0]?.price_id ||
    null;

  return { email, priceId };
}

router.post("/webhook/paddle", async (req, res): Promise<void> => {
  const rawBody: Buffer = (req as any).rawBody;
  const signatureHeader = req.headers["paddle-signature"] as string | undefined;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (webhookSecret && signatureHeader) {
    if (!verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)) {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
  }

  const eventType: string = req.body?.event_type || "unknown";
  const data: Record<string, any> = req.body?.data || {};

  await db.insert(webhookLogsTable).values({
    eventType,
    payload: JSON.stringify(req.body),
    status: "processing",
  });

  try {
    const { email, priceId } = extractFromEvent(data);

    if (eventType === "transaction.completed") {
      if (!email) throw new Error("No customer email in transaction.completed event");

      const planInfo = priceId ? PRICE_MAP[priceId] : null;
      if (!planInfo) throw new Error(`Unknown price_id: ${priceId}`);

      const resetAt = new Date();
      resetAt.setMonth(resetAt.getMonth() + 1);

      await db
        .update(usersTable)
        .set({
          plan: planInfo.plan,
          creditsRemaining: planInfo.credits,
          creditsTotal: planInfo.credits,
          subscriptionStatus: "active",
          subscriptionId: data?.subscription_id || null,
          creditsResetAt: resetAt,
        })
        .where(eq(usersTable.email, email));

    } else if (eventType === "transaction.payment_failed") {
      if (!email) throw new Error("No customer email in transaction.payment_failed event");

      await db
        .update(usersTable)
        .set({ subscriptionStatus: "inactive" })
        .where(eq(usersTable.email, email));

    } else if (eventType === "subscription.created") {
      if (!email) throw new Error("No customer email in subscription.created event");

      await db
        .update(usersTable)
        .set({
          subscriptionStatus: "active",
          subscriptionId: data?.id || null,
        })
        .where(eq(usersTable.email, email));

    } else if (eventType === "subscription.canceled") {
      if (!email) throw new Error("No customer email in subscription.canceled event");

      await db
        .update(usersTable)
        .set({ subscriptionStatus: "cancel_at_period_end" })
        .where(eq(usersTable.email, email));
    }

    await db
      .update(webhookLogsTable)
      .set({ status: "processed" })
      .where(eq(webhookLogsTable.payload, JSON.stringify(req.body)));

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook/paddle] processing error:", err);

    await db
      .update(webhookLogsTable)
      .set({ status: "error" })
      .where(eq(webhookLogsTable.payload, JSON.stringify(req.body)));

    res.status(200).json({ received: true });
  }
});

export default router;
