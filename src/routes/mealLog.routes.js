import { Router } from "express";
import { setMealLog, listMealLogs } from "../services/mealLogService.js";
import { HttpError } from "../errors.js";
import { requireInteger, requireText, requireDateKey } from "../validation.js";
import { toDateKey, shiftDateKey } from "../domain/dateKey.js";

export const mealLogRouter = Router();

const MAX_PLAN_DAYS = 14;
const DEFAULT_LOOKBACK_DAYS = 60;
const MAX_RANGE_DAYS = 366;

// Đồng bộ tiến độ về các thiết bị: mặc định trả 60 ngày gần nhất.
mealLogRouter.get("/meal-logs", async (req, res) => {
  const today = toDateKey(new Date());
  const to = req.query.to ? requireDateKey(req.query.to, "Ngày kết thúc") : today;
  const from = req.query.from ? requireDateKey(req.query.from, "Ngày bắt đầu") : shiftDateKey(to, -DEFAULT_LOOKBACK_DAYS);
  if (from > to || Date.parse(to) - Date.parse(from) > MAX_RANGE_DAYS * 86400000) throw new HttpError(400, "Khoảng ngày không hợp lệ.");
  res.json(await listMealLogs(req.user.id, { from, to }));
});

mealLogRouter.put("/meal-logs", async (req, res) => {
  const { planId, date, dayIndex, mealSlot, eaten } = req.body;
  if (typeof eaten !== "boolean") throw new HttpError(400, "Trạng thái đã ăn không hợp lệ.");
  res.json(
    await setMealLog(req.user, {
      planId: requireText(planId, { label: "planId", max: 64 }),
      date: requireDateKey(date, "Ngày"),
      dayIndex: requireInteger(dayIndex, { min: 1, max: MAX_PLAN_DAYS, label: "Ngày trong thực đơn" }),
      mealSlot: requireText(mealSlot, { label: "Bữa ăn", max: 20 }),
      eaten,
    })
  );
});
