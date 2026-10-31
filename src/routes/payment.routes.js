import { Router } from "express";
import {
  createPaymentOrder,
  getOrderStatus,
  handleSepayWebhook,
  simulatePaymentSuccess,
  getUserPaymentHistory,
  getAdminPaymentReport,
} from "../services/paymentService.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { HttpError } from "../errors.js";

export const publicPaymentRouter = Router();
export const paymentRouter = Router();
export const adminPaymentRouter = Router();

// ==========================================
// 1. CÔNG KHAI: Webhook từ SePay (Không cần JWT User)
// Quy chuẩn bắt buộc từ SePay: Response HTTP 200 và JSON body bắt buộc có {"success": true}
// ==========================================
publicPaymentRouter.post("/payment/sepay-webhook", async (req, res) => {
  try {
    const result = await handleSepayWebhook({
      body: req.body,
      rawBody: req.rawBody,
      headers: req.headers,
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[SePay Webhook Error]", error);
    // Luôn trả HTTP 200 kèm {"success": true} theo hợp đồng SePay Webhook
    return res.status(200).json({
      success: true,
      error: error.message || "Lỗi xử lý webhook",
      handled: true,
    });
  }
});

// ==========================================
// 2. YÊU CẦU ĐĂNG NHẬP: Người dùng thanh toán
// ==========================================
paymentRouter.post("/payment/create-order", async (req, res, next) => {
  try {
    const { plan } = req.body;
    const result = await createPaymentOrder({ userId: req.user.id, planId: plan });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

paymentRouter.get("/payment/orders/:orderCode", async (req, res, next) => {
  try {
    const result = await getOrderStatus(req.params.orderCode, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Giả lập thanh toán thành công (chỉ cho phép trong môi trường test/sandbox, cấm trên production)
paymentRouter.post("/payment/orders/:orderCode/simulate", async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(403, "Tính năng giả lập thanh toán bị vô hiệu hoá trên môi trường production.");
    }
    const result = await simulatePaymentSuccess(req.params.orderCode, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

paymentRouter.get("/payment/my-history", async (req, res, next) => {
  try {
    const history = await getUserPaymentHistory(req.user.id);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. DÀNH CHO ADMIN: Báo cáo doanh thu & người dùng trả phí
// ==========================================
adminPaymentRouter.get("/payment-report", async (req, res, next) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const report = await getAdminPaymentReport(days);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

