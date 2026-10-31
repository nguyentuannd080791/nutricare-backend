import { verifyToken } from "../services/authService.js";
import { prisma } from "../services/prismaClient.js";
import { HttpError } from "../errors.js";

// Xác thực JWT rồi nạp lại user từ DATABASE (không tin payload token cho các
// field có thể đổi như isPremium/aiPlanCount) — backend luôn là nơi quyết định.
// Trả null nếu không có token hoặc token không hợp lệ.
async function authenticate(req) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return null;

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return null;
  }
  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export async function requireAuth(req, _res, next) {
  req.user = await authenticate(req);
  if (!req.user) throw new HttpError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  next();
}

// Cho endpoint công khai nhưng có thêm thông tin cá nhân hoá khi đã đăng nhập.
export async function optionalAuth(req, _res, next) {
  req.user = await authenticate(req);
  next();
}
