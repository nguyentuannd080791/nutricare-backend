import "dotenv/config";
import os from "node:os";
import express from "express";
import cors from "cors";
import ngrok from "@ngrok/ngrok";
import { apiRouter } from "./routes/index.js";
import { HttpError } from "./errors.js";
import { initializeApp } from "firebase/app";

if (!process.env.JWT_SECRET) {
  console.error("Thiếu JWT_SECRET trong .env — không thể khởi động.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);

const app = express();
app.use(cors());
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
); // ảnh scan gửi base64 nên cần giới hạn lớn hơn mặc định
app.use((req, _res, next) => {
  req.body ??= {}; // Express 5: req.body là undefined khi request không có body
  next();
});
app.use("/api", apiRouter);

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ error: "Dữ liệu gửi lên không đúng định dạng JSON." });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Dữ liệu gửi lên quá lớn." });
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ nội bộ." });
});

// Nghe trên 0.0.0.0 (không chỉ localhost) để điện thoại/emulator trong cùng
// mạng LAN gọi được tới máy đang chạy backend.
const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", async () => {
  console.log(`NutriCare API đang chạy:\n  http://localhost:${port}/api`);
  for (const ip of lanAddresses())
    console.log(
      `  http://${ip}:${port}/api   (mạng LAN — dùng cho điện thoại)`,
    );

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
