import nodemailer from "nodemailer";
import { RESET_TOKEN_TTL_MINUTES } from "../domain/passwordResetRules.js";

const DEFAULT_SENDER = "NutriCare <service@nutricare.io.vn>";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function buildResetMessage(link) {
  const text =
    `Bạn vừa yêu cầu đặt lại mật khẩu NutriCare.\n\n` +
    `Mở liên kết sau để đặt mật khẩu mới (hiệu lực ${RESET_TOKEN_TTL_MINUTES} phút, chỉ dùng được 1 lần):\n${link}\n\n` +
    `Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const html =
    `<p>Bạn vừa yêu cầu đặt lại mật khẩu NutriCare.</p>` +
    `<p><a href="${link}">Đặt lại mật khẩu</a></p>` +
    `<p>Liên kết có hiệu lực ${RESET_TOKEN_TTL_MINUTES} phút và chỉ dùng được 1 lần.</p>` +
    `<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;
  return { text, html };
}

export async function sendPasswordResetEmail(to, link) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") throw new Error("Chưa cấu hình SMTP_HOST.");
    console.log(`[MAIL-DEV] Liên kết đặt lại mật khẩu cho ${to}: ${link}`);
    return;
  }
  const { text, html } = buildResetMessage(link);
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || DEFAULT_SENDER,
    to,
    subject: "Đặt lại mật khẩu NutriCare",
    text,
    html,
  });
}
