import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth.js";
import { CreateCheckoutBody, GetPlansResponse, CreateCheckoutResponse, CancelSubscriptionResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceEur: 49,
    credits: 60,
    description: "Perfect for individual agents just getting started",
    features: [
      "60 listing credits/month",
      "CSV bulk upload",
      "Concise & Detailed modes",
      "CSV export",
      "Email support",
    ],
    isPopular: false,
    paddleProductId: process.env.PADDLE_PRODUCT_STARTER || null,
  },
  {
    id: "pro",
    name: "Pro",
    priceEur: 129,
    credits: 200,
    description: "For busy agents handling multiple listings monthly",
    features: [
      "200 listing credits/month",
      "CSV bulk upload",
      "Concise & Detailed modes",
      "Social media captions",
      "CSV export",
      "Priority support",
    ],
    isPopular: true,
    paddleProductId: process.env.PADDLE_PRODUCT_PRO || null,
  },
  {
    id: "agency",
    name: "Agency",
    priceEur: 299,
    credits: 600,
    description: "For agencies with high-volume listing needs",
    features: [
      "600 listing credits/month",
      "CSV bulk upload",
      "Concise & Detailed modes",
      "Social media captions",
      "Multi-user seats",
      "CSV export",
      "Dedicated support",
    ],
    isPopular: false,
    paddleProductId: process.env.PADDLE_PRODUCT_AGENCY || null,
  },
];

router.get("/subscriptions/plans", (_req, res): void => {
  res.json(GetPlansResponse.parse({ plans: PLANS }));
});

router.post("/subscriptions/checkout", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const plan = PLANS.find(p => p.id === parsed.data.planId);
  if (!plan) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  if (!plan.paddleProductId) {
    res.status(400).json({ error: "Payment not yet configured for this plan. Contact support at support@astryon.in" });
    return;
  }

  const checkoutUrl = `https://buy.paddle.com/checkout/${plan.paddleProductId}?email=${encodeURIComponent(user.email)}&passthrough=${encodeURIComponent(JSON.stringify({ userId: user.id, planId: plan.id }))}`;

  res.json(CreateCheckoutResponse.parse({ checkoutUrl }));
});

router.post("/subscriptions/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!user.subscriptionId) {
    res.status(400).json({ error: "No active subscription found" });
    return;
  }

  res.json(CancelSubscriptionResponse.parse({ message: "To cancel your subscription, please contact support@astryon.in or manage it through your Paddle billing portal." }));
});

export default router;
