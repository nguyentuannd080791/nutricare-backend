import "dotenv/config";
import os from "node:os";
import express from "express";
import cors from "cors";
import ngrok from "@ngrok/ngrok";
import { apiRouter } from "./routes/index.js";
import { HttpError } from "./errors.js";

// Thẩm định bảo mật JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16 || process.env.JWT_SECRET === "randomString") {
  if (process.env.NODE_ENV === "production") {
    console.error("LỖI BẢO MẬT: JWT_SECRET chưa được cấu hình an toàn trên production (tối thiểu 16 ký tự).");
    process.exit(1);
  } else {
    console.warn("[CẢNH BÁO BẢO MẬT] JWT_SECRET đang dùng giá trị mặc định hoặc quá ngắn. Cần đổi trước khi deploy production.");
  }
}

const app = express();

// 1. Tắt header lộ framework Express
app.disable("x-powered-by");

// 2. Thiết lập HTTP Security Headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// 3. Cấu hình CORS an toàn theo môi trường
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.APP_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (curl, mobile app Native, ngrok webhook, server-to-server)
      if (!origin) return callback(null, true);
      // Môi trường Dev/Test: Cho phép localhost và mạng LAN
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      // Production: Chỉ cho phép origins được khai báo trong ALLOWED_ORIGINS hoặc APP_URL
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new HttpError(403, "CORS: Nguồn truy cập không được phép."));
    },
    credentials: true,
  })
);

// 4. Giới hạn kích thước payload: 100kb mặc định để chống DoS bộ nhớ, riêng scan ảnh 10mb
app.use((req, res, next) => {
  const isScanRoute = req.path === "/api/scan/analyze";
  express.json({
    limit: isScanRoute ? "10mb" : "100kb",
    verify: (r, _s, buf) => {
      r.rawBody = buf.toString("utf8");
    },
  })(req, res, next);
});

app.use((req, _res, next) => {
  req.body ??= {}; // Express 5: req.body là undefined khi request không có body
  next();
});

app.use("/api", apiRouter);

// 5. Centralized Error Handler - Không rò rỉ stack trace hoặc lỗi CSDL ra client
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Dữ liệu gửi lên không đúng định dạng JSON." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Dữ liệu gửi lên quá lớn." });
  }
  console.error("[Internal Server Error]", err);
  res.status(500).json({ error: "Lỗi máy chủ nội bộ." });
});

// Nghe trên 0.0.0.0 (không chỉ localhost) để điện thoại/emulator trong cùng
// mạng LAN gọi được tới máy đang chạy backend.
const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", async () => {
  console.log(`NutriCare API đang chạy:\n  http://localhost:${port}/api`);
  for (const ip of lanAddresses()) {
    console.log(`  http://${ip}:${port}/api   (mạng LAN — dùng cho điện thoại)`);
  }

  // Chỉ mở tunnel Ngrok khi chạy cục bộ trên máy dev (bỏ qua khi deploy trên Render cloud)
  if (!process.env.RENDER && process.env.NGROK_AUTHTOKEN) {
    try {
      const forwarder = await ngrok.forward({
        addr: port,
        authtoken_from_env: true,
        domain: process.env.NGROK_DOMAIN || undefined,
      });
      console.log(`Ngrok Online tại: ${forwarder.url()}`);
    } catch (err) {
      console.error("Lỗi khi kết nối Ngrok:", err.message);
    }
  }
});

export default app;

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}
