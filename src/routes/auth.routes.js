import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { hashPassword, verifyPassword, issueToken } from "../services/authService.js";
import { publicUser } from "../services/serializers.js";
import { HttpError } from "../errors.js";
import { requireNewPassword, requireText } from "../validation.js";
import { requestPasswordReset, resetPassword } from "../services/passwordResetService.js";
import { authLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();
authRouter.use(authLimiter);

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function parseEmail(value) {
  const email = requireText(value, { label: "Email", max: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, "Email không hợp lệ.");
  return email;
}

const authResponse = (user) => ({ token: issueToken(user), user: publicUser(user) });

authRouter.post("/register", async (req, res) => {
  const email = parseEmail(req.body.email);
  const fullName = requireText(req.body.fullName, { label: "Họ tên" });
  const password = requireNewPassword(req.body.password);

  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, "Email này đã được đăng ký.");

  const user = await prisma.user.create({ data: { email, fullName, passwordHash: await hashPassword(password) } });
  res.status(201).json(authResponse(user));
});

authRouter.post("/login", async (req, res) => {
  const email = parseEmail(req.body.email);
  const { password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || typeof password !== "string" || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
  }
  res.json(authResponse(user));
});

authRouter.post("/forgot-password", async (req, res) => {
  const email = parseEmail(req.body.email);
  await requestPasswordReset(email);
  res.json({ message: "Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu đã được gửi." });
});

authRouter.post("/reset-password", async (req, res) => {
  const token = requireText(req.body.token, { label: "Mã đặt lại mật khẩu", max: 200 });
  const password = requireNewPassword(req.body.password);
  await resetPassword(token, password);
  res.json({ message: "Đặt lại mật khẩu thành công." });
});
