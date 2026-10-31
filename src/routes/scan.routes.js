import { Router } from "express";
import { enforceScanLimit } from "../middleware/usageLimits.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { analyzeDishPhoto } from "../services/scanService.js";
import { HttpError } from "../errors.js";

export const scanRouter = Router();

// Client chỉ gửi ảnh (base64 JPEG) + context thô — server tự soạn prompt.
scanRouter.post("/scan/analyze", aiLimiter, enforceScanLimit, async (req, res) => {
  const { imageBase64, mealSlot, userNote } = req.body;
  if (typeof imageBase64 !== "string" || !imageBase64) throw new HttpError(400, "Thiếu ảnh cần phân tích.");
  res.json(await analyzeDishPhoto(req.user, { imageBase64, mealSlot, userNote }));
});
