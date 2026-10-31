import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  generateOrderCode,
  formatTransferContent,
  extractOrderCodeFromContent,
  verifySepayHmacSignature,
  validateSepayPayload,
  computePaymentStats,
  PAYMENT_STATUS,
} from "../src/domain/paymentRules.js";

test("generateOrderCode generates valid NCxxxxxx code", () => {
  const code = generateOrderCode();
  assert.match(code, /^NC\d{6}$/);
});

test("formatTransferContent formats correctly with plan label and NC prefix", () => {
  const monthContent = formatTransferContent("NC123456", "monthly");
  assert.equal(monthContent, "Nutricare Month Premium NC123456");

  const yearContent = formatTransferContent("NC654321", "yearly");
  assert.equal(yearContent, "Nutricare Year Premium NC654321");
});

test("extractOrderCodeFromContent extracts code from noisy banking content", () => {
  assert.equal(
    extractOrderCodeFromContent("Nutricare Month Premium NC847291"),
    "NC847291"
  );
  assert.equal(
    extractOrderCodeFromContent("MB-5786666868888-Nutricare Year Premium NC555123"),
    "NC555123"
  );
  assert.equal(extractOrderCodeFromContent("Không có mã ở đây"), null);
});

test("verifySepayHmacSignature verifies correct HMAC-SHA256 signature and rejects invalid", () => {
  const secret = "whsec_test_secret_key_12345";
  const timestamp = "1730366400";
  const payload = JSON.stringify({ id: 123, transferAmount: 120000, content: "Nutricare Month Premium NC100200" });

  const validHash = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const validSignature = `sha256=${validHash}`;

  // 1. Chữ ký hợp lệ
  const resultValid = verifySepayHmacSignature({
    signature: validSignature,
    timestamp,
    payload,
    secret,
  });
  assert.equal(resultValid.verified, true);

  // 2. Chữ ký sai hoặc bị can thiệp
  const resultInvalid = verifySepayHmacSignature({
    signature: "sha256=invalid_tampered_signature",
    timestamp,
    payload,
    secret,
  });
  assert.equal(resultInvalid.verified, false);

  // 3. Thiếu signature khi có secret
  const resultMissingSig = verifySepayHmacSignature({
    signature: "",
    timestamp,
    payload,
    secret,
  });
  assert.equal(resultMissingSig.verified, false);

  // 4. Khi chưa cấu hình secret thì cho phép bypass trong dev
  const resultNoSecret = verifySepayHmacSignature({
    signature: "",
    timestamp,
    payload,
    secret: "",
  });
  assert.equal(resultNoSecret.verified, true);
});

test("validateSepayPayload rejects invalid payloads and accepts valid transaction", () => {
  // Reject transferType 'out'
  const outTx = validateSepayPayload({
    transferType: "out",
    transferAmount: 120000,
    content: "Nutricare Month Premium NC100200",
  });
  assert.equal(outTx.valid, false);

  // Reject missing code
  const missingCode = validateSepayPayload({
    transferType: "in",
    transferAmount: 120000,
    content: "Chuyen tien khong ghi noi dung",
  });
  assert.equal(missingCode.valid, false);

  // Accept valid transfer with NC code in content
  const validTx = validateSepayPayload({
    id: 999123,
    gateway: "MBBank",
    accountNumber: "5786666868888",
    transferType: "in",
    transferAmount: 120000,
    content: "Nutricare Month Premium NC100200",
    referenceCode: "FT263051234",
  });
  assert.equal(validTx.valid, true);
  assert.equal(validTx.orderCode, "NC100200");
  assert.equal(validTx.amount, 120000);
  assert.equal(validTx.bankName, "MBBank");

  // Accept SePay Test Webhook ping (from Dashboard 'Gửi thử Webhook')
  const testPing = validateSepayPayload({
    id: 99999,
    content: "Gửi thử Webhook SePay",
    transferType: "in",
    transferAmount: 10000,
  });
  assert.equal(testPing.valid, true);
  assert.equal(testPing.isTest, true);
});

test("computePaymentStats aggregates revenue, paid conversion, and plan breakdown", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");
  const transactions = [
    {
      id: "1",
      userId: "u1",
      amount: 120000,
      plan: "monthly",
      status: PAYMENT_STATUS.COMPLETED,
      completedAt: new Date("2026-10-30T10:00:00.000Z"),
    },
    {
      id: "2",
      userId: "u2",
      amount: 990000,
      plan: "yearly",
      status: PAYMENT_STATUS.COMPLETED,
      completedAt: new Date("2026-10-31T08:00:00.000Z"),
    },
    {
      id: "3",
      userId: "u3",
      amount: 120000,
      plan: "monthly",
      status: PAYMENT_STATUS.PENDING,
      createdAt: new Date("2026-10-31T09:00:00.000Z"),
    },
  ];

  const stats = computePaymentStats({
    transactions,
    totalUsers: 10,
    days: 7,
    now,
  });

  assert.equal(stats.totals.totalRevenue, 1110000);
  assert.equal(stats.totals.completedTransactions, 2);
  assert.equal(stats.totals.paidUsersCount, 2);
  assert.equal(stats.totals.conversionRate, 0.2); // 2/10
  assert.equal(stats.planBreakdown.monthly.revenue, 120000);
  assert.equal(stats.planBreakdown.yearly.revenue, 990000);
  assert.equal(stats.series.length, 7);
});

test("handleSepayWebhook responds with { success: true } for SePay test dashboard ping", async () => {
  const { handleSepayWebhook } = await import("../src/services/paymentService.js");
  const testResponse = await handleSepayWebhook({
    body: {
      id: 99999,
      content: "Gửi thử Webhook SePay",
      transferType: "in",
      transferAmount: 10000,
    },
    headers: {},
  });

  assert.equal(testResponse.success, true);
  assert.equal(testResponse.isTest, true);
});
