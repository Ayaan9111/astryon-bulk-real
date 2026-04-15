import { Router, type IRouter } from "express";
import { db, feedbackTable } from "@workspace/db";
import { requireAuth } from "../lib/auth.js";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/feedback", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(feedbackTable).values({
    userId: user.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
    type: parsed.data.type,
  });

  res.status(201).json({ message: "Feedback submitted successfully. Thank you!" });
});

export default router;
