import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRateLimiter } from "../src/middleware/rateLimiter.js";
import { verifySepayHmacSignature } from "../src/domain/paymentRules.js";
import { HttpError } from "../src/errors.js";

test("createRateLimiter sets standard headers and blocks requests exceeding threshold", () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 3,
    message: "Quá nhiều yêu cầu",
    keyGenerator: () => "test-client-ip",
  });

  const headers = {};
  const mockRes = {
    setHeader: (key, val) => {
      headers[key] = val;
    },
  };

  let nextCalled = 0;
  const mockNext = () => {
    nextCalled += 1;
  };

  // 1. First 3 requests should pass
  for (let i = 0; i < 3; i++) {
    limiter({ ip: "127.0.0.1" }, mockRes, mockNext);
  }
  assert.equal(nextCalled, 3);
  assert.equal(headers["RateLimit-Limit"], 3);
  assert.equal(headers["RateLimit-Remaining"], 0);

  // 2. 4th request must throw HttpError 429
  assert.throws(
    () => limiter({ ip: "127.0.0.1" }, mockRes, mockNext),
    (err) => err instanceof HttpError && err.status === 429 && err.message === "Quá nhiều yêu cầu"
  );
  assert.ok(headers["Retry-After"] > 0);
});

test("verifySepayHmacSignature enforces strict security in production", () => {
  const secret = "whsec_super_secret_production_key_123";
  const timestamp = String(Date.now());
  const payload = JSON.stringify({ transferAmount: 120000, content: "Nutricare Month Premium NC112233" });

  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

  // 1. Hợp lệ trong production
  const validRes = verifySepayHmacSignature({
    signature,
    timestamp,
    payload,
    secret,
    isProduction: true,
  });
  assert.equal(validRes.verified, true);

  // 2. Chữ ký sai bị từ chối
  const invalidRes = verifySepayHmacSignature({
    signature: "abcdef0123456789",
    timestamp,
    payload,
    secret,
    isProduction: true,
  });
  assert.equal(invalidRes.verified, false);

  // 3. Thiếu secret trong production BẮT BUỘC bị từ chối, không cho phép bypass
  const missingSecretProd = verifySepayHmacSignature({
    signature: "",
    timestamp,
    payload,
    secret: "",
    isProduction: true,
  });
  assert.equal(missingSecretProd.verified, false);
  assert.match(missingSecretProd.error, /SEPAY_SECRET_KEY chưa được cấu hình/);
});
