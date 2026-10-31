import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import {
  PAYMENT_PLANS,
  PAYMENT_STATUS,
  generateOrderCode,
  formatTransferContent,
  validateSepayPayload,
  verifySepayHmacSignature,
  computePaymentStats,
} from "../domain/paymentRules.js";

// Cấu hình tài khoản nhận tiền qua SePay & VietQR
export function getSepayConfig() {
  return {
    accountNumber: process.env.SEPAY_ACC || "5786666868888",
    bank: process.env.SEPAY_BANK || "MBBank",
    accountName: process.env.SEPAY_ACC_NAME || "NGUYEN TIEN DAT",
    secretKey: process.env.SEPAY_SECRET_KEY || "", // Khóa bí mật HMAC-SHA256 (whsec_...)
    apiKey: process.env.SEPAY_API_KEY || "",
  };
}

/**
 * 1. Khởi tạo đơn hàng thanh toán SePay mới
 */
export async function createPaymentOrder({ userId, planId }) {
  const plan = PAYMENT_PLANS[planId] || PAYMENT_PLANS.monthly;
  const orderCode = generateOrderCode();
  const transferContent = formatTransferContent(orderCode, plan.id);
  const sepay = getSepayConfig();

  // Tạo URL mã QR chuẩn theo mẫu vietqr.app và SePay
  const vietQrAppUrl = `https://vietqr.app/img?bank=${sepay.bank}&acc=${sepay.accountNumber}&template=compact&amount=${plan.price}&des=${encodeURIComponent(
    transferContent
  )}&showinfo=true&fullacc=true&holder=${encodeURIComponent(sepay.accountName)}`;

  const sepayQrUrl = `https://qr.sepay.vn/img?acc=${sepay.accountNumber}&bank=${sepay.bank}&amount=${plan.price}&des=${encodeURIComponent(
    transferContent
  )}`;

  // Lưu thông tin giao dịch vào CSDL
  const order = await prisma.paymentTransaction.create({
    data: {
      orderCode,
      userId,
      amount: plan.price,
      plan: plan.id,
      status: PAYMENT_STATUS.PENDING,
      gateway: "SEPAY",
      transferContent,
      bankAccount: sepay.accountNumber,
      bankName: sepay.bank,
    },
  });

  return {
    order: {
      id: order.id,
      orderCode: order.orderCode,
      amount: order.amount,
      plan: order.plan,
      planName: plan.name,
      status: order.status,
      createdAt: order.createdAt,
    },
    paymentInfo: {
      bankName: sepay.bank,
      bankAccount: sepay.accountNumber,
      accountName: sepay.accountName,
      transferContent,
      amount: plan.price,
      qrUrl: vietQrAppUrl,
      sepayQrUrl,
      vietQrAppUrl,
    },
  };
}

/**
 * 2. Lấy trạng thái đơn hàng (dành cho frontend polling thời gian thực)
 */
export async function getOrderStatus(orderCode, userId) {
  const order = await prisma.paymentTransaction.findUnique({
    where: { orderCode },
    include: { user: { select: { id: true, isPremium: true } } },
  });

  if (!order) {
    throw new HttpError(404, `Không tìm thấy đơn hàng mã ${orderCode}`);
  }

  // Đảm bảo chỉ chủ đơn hàng hoặc Admin mới xem được
  if (userId && order.userId !== userId) {
    throw new HttpError(403, "Bạn không có quyền xem thông tin đơn hàng này");
  }

  return {
    orderCode: order.orderCode,
    status: order.status,
    amount: order.amount,
    plan: order.plan,
    isPremium: order.user?.isPremium || false,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
  };
}

/**
 * 3. Xử lý Webhook tự động từ cổng thanh toán SePay
 * Quy chuẩn bắt buộc từ SePay: Phải phản hồi HTTP 200 và response body có: {"success": true}
 * Hỗ trợ xác thực chữ ký số bảo mật cao HMAC-SHA256 (theo header x-sepay-signature & x-sepay-timestamp)
 */
export async function handleSepayWebhook({ body, rawBody, headers = {} }) {
  const sepay = getSepayConfig();
  const signature =
    headers["x-sepay-signature"] ||
    headers["x-SePay-signature"] ||
    headers["X-Sepay-Signature"] ||
    headers["X-SePay-Signature"] ||
    "";
  const timestamp =
    headers["x-sepay-timestamp"] ||
    headers["x-SePay-timestamp"] ||
    headers["X-Sepay-Timestamp"] ||
    headers["X-SePay-Timestamp"] ||
    "";

  // 1. Thẩm định nội dung payload và phát hiện Test Webhook / Ping
  const validation = validateSepayPayload(body);

  // 2. Nếu là Test Webhook từ SePay Dashboard (khi user bấm 'Gửi thử Webhook' để kiểm tra kết nối)
  if (validation.isTest) {
    console.log("[SePay Webhook] Đã tiếp nhận Test Webhook từ SePay Dashboard:", {
      referenceCode: validation.referenceCode,
      amount: validation.amount,
      content: body?.content || body?.description,
    });
    return {
      success: true,
      message: "NutriCare API đã tiếp nhận test webhook SePay thành công.",
      isTest: true,
    };
  }

  // 3. Xác thực HMAC-SHA256 nếu SEPAY_SECRET_KEY được thiết lập
  if (sepay.secretKey) {
    const verification = verifySepayHmacSignature({
      signature,
      timestamp,
      payload: rawBody || body,
      secret: sepay.secretKey,
    });

    if (!verification.verified) {
      console.warn("[SePay Webhook] Chữ ký HMAC không khớp:", verification.error);
      return {
        success: true,
        rejected: true,
        message: "Từ chối kích hoạt: Chữ ký số HMAC-SHA256 không hợp lệ.",
      };
    }
  } else if (sepay.apiKey) {
    // Dự phòng phương thức API Key cũ
    const authHeader = headers.authorization || "";
    const headerKey = authHeader.replace(/^Apikey\s+/i, "")?.replace(/^Bearer\s+/i, "")?.trim();
    if (headerKey !== sepay.apiKey.trim()) {
      return {
        success: true,
        rejected: true,
        message: "Từ chối kích hoạt: API Key SePay không chính xác.",
      };
    }
  }

  // 4. Bỏ qua nếu payload không hợp lệ hoặc không có mã đơn hàng NutriCare
  if (!validation.valid || !validation.orderCode) {
    return {
      success: true,
      ignored: true,
      message: validation.error || "Bỏ qua giao dịch: Không chứa mã đơn hàng NutriCare (NCxxxxxx).",
    };
  }

  // 5. Tìm đơn hàng khớp với mã NCxxxxxx
  const order = await prisma.paymentTransaction.findUnique({
    where: { orderCode: validation.orderCode },
  });

  if (!order) {
    return {
      success: true,
      orderFound: false,
      message: `Đã tiếp nhận webhook nhưng không tìm thấy đơn hàng ${validation.orderCode} trên hệ thống.`,
    };
  }

  // 6. Nếu đơn hàng đã hoàn tất trước đó, trả về thành công an toàn (Idempotency)
  if (order.status === PAYMENT_STATUS.COMPLETED) {
    return {
      success: true,
      message: `Đơn hàng ${order.orderCode} đã được kích hoạt thành công trước đó.`,
      alreadyCompleted: true,
    };
  }

  // 7. Kiểm tra số tiền chuyển khoản
  if (validation.amount < order.amount) {
    return {
      success: true,
      underpaid: true,
      message: `Số tiền chuyển khoản (${validation.amount}đ) ít hơn giá trị đơn hàng (${order.amount}đ). Chưa kích hoạt Pro.`,
    };
  }

  // 8. Thực hiện giao dịch nguyên tử: Cập nhật đơn hàng -> Nâng cấp tài khoản User
  const now = new Date();
  await prisma.$transaction([
    prisma.paymentTransaction.update({
      where: { id: order.id },
      data: {
        status: PAYMENT_STATUS.COMPLETED,
        sepayTransactionId: validation.sepayTransactionId,
        referenceCode: validation.referenceCode,
        bankAccount: validation.bankAccount,
        bankName: validation.bankName,
        transactionDate: validation.transactionDate,
        completedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: { isPremium: true },
    }),
  ]);

  return {
    success: true,
    message: `Đơn hàng ${order.orderCode} đã thanh toán thành công. Tài khoản đã nâng cấp Pro.`,
    orderCode: order.orderCode,
    userId: order.userId,
  };
}

/**
 * 4. Giả lập xác nhận thanh toán (Dùng trong môi trường Dev/Test Sandbox)
 */
export async function simulatePaymentSuccess(orderCode, userId) {
  const order = await prisma.paymentTransaction.findUnique({
    where: { orderCode },
  });

  if (!order) {
    throw new HttpError(404, `Không tìm thấy đơn hàng ${orderCode}`);
  }

  if (userId && order.userId !== userId) {
    throw new HttpError(403, "Bạn không có quyền thao tác đơn hàng này");
  }

  if (order.status === PAYMENT_STATUS.COMPLETED) {
    return { success: true, message: "Đơn hàng đã được kích hoạt trước đó.", orderCode };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.paymentTransaction.update({
      where: { id: order.id },
      data: {
        status: PAYMENT_STATUS.COMPLETED,
        referenceCode: `SIM_${Date.now()}`,
        transactionDate: now,
        completedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: { isPremium: true },
    }),
  ]);

  return {
    success: true,
    message: `Đơn hàng ${order.orderCode} đã được giả lập thanh toán thành công.`,
    orderCode: order.orderCode,
  };
}

/**
 * 5. Lịch sử thanh toán của người dùng hiện tại
 */
export async function getUserPaymentHistory(userId) {
  const transactions = await prisma.paymentTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return transactions.map((t) => ({
    id: t.id,
    orderCode: t.orderCode,
    amount: t.amount,
    plan: t.plan,
    status: t.status,
    gateway: t.gateway,
    referenceCode: t.referenceCode,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  }));
}

/**
 * 6. Tổng hợp báo cáo người dùng trả phí & doanh thu dành cho Admin
 */
export async function getAdminPaymentReport(days = 30) {
  const [transactions, totalUsers] = await Promise.all([
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    }),
    prisma.user.count(),
  ]);

  const stats = computePaymentStats({ transactions, totalUsers, days, now: new Date() });

  const recentTransactions = transactions.slice(0, 30).map((t) => ({
    id: t.id,
    orderCode: t.orderCode,
    amount: t.amount,
    plan: t.plan,
    status: t.status,
    gateway: t.gateway,
    userEmail: t.user?.email || "Unknown",
    userFullName: t.user?.fullName || "Khách hàng",
    referenceCode: t.referenceCode,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  }));

  return {
    ...stats,
    recentTransactions,
  };
}
