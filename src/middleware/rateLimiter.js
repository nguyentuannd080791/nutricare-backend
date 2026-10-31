import { HttpError } from "../errors.js";

/**
 * Middleware Rate Limiter nhẹ, zero-dependency, tuân thủ SRP (Single Responsibility).
 * Giới hạn tần suất gọi API theo IP hoặc User ID để ngăn chặn tấn công Brute-force và DoS.
 */
export function createRateLimiter({
  windowMs = 60_000,
  max = 100,
  message = "Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "global",
} = {}) {
  const hits = new Map();

  // Dọn dẹp các bản ghi quá hạn định kỳ để chống rò rỉ bộ nhớ
  const cleanupInterval = Math.max(windowMs, 60_000);
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, cleanupInterval);

  if (timer.unref) timer.unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader("Retry-After", retryAfterSec);
      throw new HttpError(429, message);
    }

    next();
  };
}

// Giới hạn tần suất cho các endpoint xác thực (ngăn chặn Brute-force / Credential Stuffing)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 30, // tối đa 30 requests trong 15 phút
  message: "Quá nhiều yêu cầu xác thực hoặc đăng nhập. Vui lòng thử lại sau 15 phút.",
});

// Giới hạn tần suất cho tính năng AI (chống spam làm cạn kiệt chi phí API Claude)
export const aiLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 20, // tối đa 20 lần trong 5 phút
  message: "Bạn đang gọi tính năng AI quá nhanh. Vui lòng thử lại sau 5 phút.",
  keyGenerator: (req) => req.user?.id || req.ip || "global-ai",
});

