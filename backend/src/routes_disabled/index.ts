import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import listingsRouter from "./listings.js";
import subscriptionsRouter from "./subscriptions.js";
import webhooksRouter from "./webhooks.js";
import feedbackRouter from "./feedback.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(listingsRouter);
router.use(subscriptionsRouter);
router.use(webhooksRouter);
router.use(feedbackRouter);
router.use(adminRouter);

export default router;
