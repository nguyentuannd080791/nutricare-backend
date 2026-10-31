import crypto from "node:crypto";
import { toDateKey, shiftDateKey, dateRange } from "./dateKey.js";

// Hằng số bảng giá chuẩn của NutriCare
export const PAYMENT_PLANS = {
  monthly: {
    id: "monthly",
    name: "Gói Hội Viên Pro - 1 Tháng",
    price: 120000,
    durationDays: 30,
    periodLabel: "1 tháng",
  },
  yearly: {
    id: "yearly",
    name: "Gói Hội Viên Pro - 1 Năm",
    price: 990000,
    durationDays: 365,
    periodLabel: "1 năm",
  },
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

/**
 * Sinh mã đơn hàng chuẩn format NCxxxxxx (bắt đầu bằng tiền tố NC để khớp bộ lọc SePay).
 */
export function generateOrderCode() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NC${randomNum}`;
}

/**
 * Tạo nội dung chuyển khoản chuẩn theo SePay & VietQR.
 * Ví dụ: "Nutricare Month Premium NC123456" hoặc "Nutricare Year Premium NC123456"
 * Chứa tiền tố "NC" để SePay bắt được mã thanh toán theo quy tắc "Lọc theo mã thanh toán: NC".
 */
export function formatTransferContent(orderCode, planId = "monthly") {
  const planLabel = planId === "yearly" ? "Year" : "Month";
  return `Nutricare ${planLabel} Premium ${orderCode.toUpperCase()}`;
}

/**
 * Trích xuất mã đơn hàng NCxxxxxx từ nội dung hoặc mô tả giao dịch SePay.
 */
export function extractOrderCodeFromContent(content) {
  if (!content || typeof content !== "string") return null;
  const match = content.toUpperCase().match(/NC\d{6}/);
  return match ? match[0] : null;
}

/**
 * Xác thực chữ ký số HMAC-SHA256 gửi từ SePay Webhook.
 * Quy chuẩn SePay:
 * Header:
 *   x-sepay-signature: 'sha256=' + hmacHex (hoặc hmacHex trực tiếp)
 *   x-sepay-timestamp: '<timestamp>'
 * Chuỗi ký: timestamp + '.' + payload
 */
export function verifySepayHmacSignature({ signature, timestamp, payload, secret, isProduction = process.env.NODE_ENV === "production" }) {
  if (!secret) {
    if (isProduction) {
      return { verified: false, error: "SEPAY_SECRET_KEY chưa được cấu hình trên môi trường production." };
    }
    // Nếu chưa cấu hình secret key trong .env thì cho phép bypass (để chạy local test / dev)
    return { verified: true, bypass: true };
  }

  if (!signature) {
    return { verified: false, error: "Thiếu header chữ ký xác thực x-sepay-signature từ SePay." };
  }

  const cleanSecret = String(secret).trim();
  const rawSig = String(signature).trim().toLowerCase();
  const normalizedSig = rawSig.startsWith("sha256=") ? rawSig.slice(7) : rawSig;

  function safeCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  // 1. Thử ký với payload chuỗi nguyên bản (rawBody)
  const payloadStr1 = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  const dataToSign1 = String(timestamp || "") + "." + payloadStr1;
  const hash1 = crypto.createHmac("sha256", cleanSecret).update(dataToSign1).digest("hex").toLowerCase();

  if (safeCompare(hash1, normalizedSig)) {
    return { verified: true };
  }

  // 2. Thử ký với JSON.stringify(object) đề phòng chênh lệch format khoảng trắng từ client/proxy
  if (typeof payload === "object" && payload !== null) {
    const dataToSign2 = String(timestamp || "") + "." + JSON.stringify(payload);
    const hash2 = crypto.createHmac("sha256", cleanSecret).update(dataToSign2).digest("hex").toLowerCase();
    if (safeCompare(hash2, normalizedSig)) {
      return { verified: true };
    }
  }

  return {
    verified: false,
    error: "Chữ ký số x-sepay-signature không khớp với dữ liệu webhook (Invalid signature).",
  };
}

/**
 * Thẩm định tính hợp lệ của Webhook gửi từ SePay.
 * Hỗ trợ nhận diện các request Test Webhook / Ping từ Dashboard SePay
 * (khi người dùng bấm 'Gửi thử Webhook' để kiểm tra kết nối).
 */
export function validateSepayPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, isTest: false, error: "Dữ liệu webhook không hợp lệ (body rỗng hoặc sai định dạng)." };
  }

  const rawContent = String(payload.content || payload.description || "");
  const isTest =
    payload.isTest === true ||
    payload.test === true ||
    /test|gửi thử|gui thu|kiem tra|kiểm tra|ping/i.test(rawContent) ||
    /test/i.test(String(payload.referenceCode || "")) ||
    /test/i.test(String(payload.code || ""));

  const amount = Number(payload.transferAmount || payload.amount || 0);
  const transferType = String(payload.transferType || "in").toLowerCase();

  // SePay có thể tự động bóc tách mã thanh toán vào payload.code nếu bật "Chỉ gửi khi có mã thanh toán"
  const orderCode =
    (payload.code && extractOrderCodeFromContent(payload.code)) ||
    extractOrderCodeFromContent(rawContent);

  // Đối với request Test Webhook từ SePay: luôn hợp lệ
  if (isTest) {
    return {
      valid: true,
      isTest: true,
      orderCode: orderCode || null,
      amount,
      sepayTransactionId: payload.id ? Number(payload.id) : null,
      referenceCode: payload.referenceCode || payload.code || "TEST_PING",
      bankAccount: payload.accountNumber || null,
      bankName: payload.gateway || null,
      transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
    };
  }

  if (transferType !== "in") {
    return { valid: false, isTest: false, error: "Giao dịch không phải tiền vào (transferType != 'in')." };
  }

  if (amount <= 0) {
    return { valid: false, isTest: false, error: "Số tiền chuyển khoản phải lớn hơn 0." };
  }

  if (!orderCode) {
    return {
      valid: false,
      isTest: false,
      error: `Không tìm thấy mã đơn hàng có tiền tố NC trong giao dịch (${rawContent || "trống"}).`,
    };
  }

  return {
    valid: true,
    isTest: false,
    orderCode,
    amount,
    sepayTransactionId: payload.id ? Number(payload.id) : null,
    referenceCode: payload.referenceCode || payload.code || null,
    bankAccount: payload.accountNumber || null,
    bankName: payload.gateway || null,
    transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
  };
}

/**
 * Hàm thuần tuý: Tính toán các chỉ số báo cáo doanh thu & người dùng trả phí cho Admin.
 */
export function computePaymentStats({ transactions = [], totalUsers = 0, days = 30, now = new Date() }) {
  const to = toDateKey(now);
  const from = shiftDateKey(to, -(days - 1));
  const validDates = new Set(dateRange(from, to));

  let totalRevenue = 0;
  let completedCount = 0;
  const paidUserIds = new Set();
  const planBreakdown = {
    monthly: { count: 0, revenue: 0 },
    yearly: { count: 0, revenue: 0 },
  };

  const dailyMap = new Map();
  for (const d of validDates) {
    dailyMap.set(d, { date: d, revenue: 0, count: 0 });
  }

  for (const tx of transactions) {
    if (tx.status !== PAYMENT_STATUS.COMPLETED) continue;

    totalRevenue += tx.amount;
    completedCount += 1;
    if (tx.userId) paidUserIds.add(tx.userId);

    const planKey = tx.plan === "yearly" ? "yearly" : "monthly";
    planBreakdown[planKey].count += 1;
    planBreakdown[planKey].revenue += tx.amount;

    const txDateKey = toDateKey(tx.completedAt || tx.createdAt);
    if (dailyMap.has(txDateKey)) {
      const entry = dailyMap.get(txDateKey);
      entry.revenue += tx.amount;
      entry.count += 1;
    }
  }

  const paidUsersCount = paidUserIds.size;
  const conversionRate = totalUsers > 0 ? Number((paidUsersCount / totalUsers).toFixed(4)) : 0;

  const series = dateRange(from, to).map((date) => dailyMap.get(date));

  return {
    period: { from, to, days },
    totals: {
      totalRevenue,
      completedTransactions: completedCount,
      paidUsersCount,
      totalUsers,
      conversionRate,
    },
    planBreakdown,
    series,
  };
}
