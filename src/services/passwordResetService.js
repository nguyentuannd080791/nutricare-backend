import crypto from "node:crypto";
import { prisma } from "./prismaClient.js";
import { hashPassword } from "./authService.js";
import { sendPasswordResetEmail } from "./mailService.js";
import { HttpError } from "../errors.js";
import { calcResetExpiry, isResendTooSoon } from "../domain/passwordResetRules.js";

const INVALID_LINK_MESSAGE = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetLink(token) {
  const appUrl = process.env.APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") throw new Error("Chưa cấu hình APP_URL.");
  const link = new URL("/app", appUrl || "http://localhost:5173");
  link.hash = `reset_token=${token}`;
  return link.toString();
}

// Luôn trả về bình thường dù email có tồn tại hay không, để không lộ email nào đã đăng ký.
export async function requestPasswordReset(email, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const lastToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastToken && isResendTooSoon(lastToken.createdAt, now)) return;

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const saved = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: calcResetExpiry(now) },
  });

  try {
    await sendPasswordResetEmail(user.email, buildResetLink(token));
  } catch (error) {
    console.error("Gửi email đặt lại mật khẩu thất bại:", error.message);
    await prisma.passwordResetToken.delete({ where: { id: saved.id } });
  }
}

export async function resetPassword(token, newPassword, now = new Date()) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) throw new HttpError(400, INVALID_LINK_MESSAGE);

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw new HttpError(400, INVALID_LINK_MESSAGE);
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
  });
}
