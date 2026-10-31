import { Router } from "express";
import { getWaterLog, setTodayWaterLog } from "../services/waterLogService.js";
import { requireInteger, requireDateKey } from "../validation.js";
import { toDateKey } from "../domain/dateKey.js";
import { WATER_MAX_CUPS } from "../domain/waterRules.js";

export const waterRouter = Router();

waterRouter.get("/water-logs", async (req, res) => {
  const date = req.query.date ? requireDateKey(req.query.date, "Ngày") : toDateKey(new Date());
  res.json(await getWaterLog(req.user.id, date));
});

waterRouter.put("/water-logs", async (req, res) => {
  const cups = requireInteger(req.body.cups, { min: 0, max: WATER_MAX_CUPS, label: "Số cốc nước" });
  res.json(await setTodayWaterLog(req.user.id, cups));
});
