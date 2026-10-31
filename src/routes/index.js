import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { authRouter } from "./auth.routes.js";
import { catalogRouter } from "./catalog.routes.js";
import { rawFoodRouter } from "./rawFood.routes.js";
import { meRouter } from "./me.routes.js";
import { bmiRouter } from "./bmi.routes.js";
import { targetRouter } from "./target.routes.js";
import { healthRouter } from "./health.routes.js";
import { planRouter } from "./plan.routes.js";
import { scanRouter } from "./scan.routes.js";
import { premiumRouter } from "./premium.routes.js";
import { mealLogRouter } from "./mealLog.routes.js";
import { exerciseLogRouter } from "./exerciseLog.routes.js";
import { waterRouter } from "./water.routes.js";
import { workoutPlanRouter } from "./workoutPlan.routes.js";
import { streakRouter } from "./streak.routes.js";
import { dailySummaryRouter } from "./dailySummary.routes.js";
import { adminRouter } from "./admin.routes.js";
import { publicPaymentRouter, paymentRouter, adminPaymentRouter } from "./payment.routes.js";
import { requireAdmin } from "../middleware/admin.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));

// Công khai — không cần đăng nhập.
apiRouter.use("/auth", authRouter);
apiRouter.use(publicPaymentRouter);
apiRouter.use(catalogRouter);
apiRouter.use(rawFoodRouter);

// Từ đây trở xuống: bắt buộc đăng nhập (đặt SAU các router công khai).
apiRouter.use(requireAuth);
apiRouter.use(meRouter, bmiRouter, targetRouter, healthRouter, planRouter, scanRouter, premiumRouter, paymentRouter, mealLogRouter, exerciseLogRouter, dailySummaryRouter, waterRouter, workoutPlanRouter, streakRouter);

// Chỉ tài khoản có email trong ADMIN_EMAILS (.env); các router trên không khớp /admin nên không chồng lấn.
apiRouter.use("/admin", requireAdmin, adminRouter);
apiRouter.use("/admin/payments", requireAdmin, adminPaymentRouter);
