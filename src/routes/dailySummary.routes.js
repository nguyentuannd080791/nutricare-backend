import { Router } from "express";
import { getDailySummary } from "../services/dailySummaryService.js";
import { requireDateKey } from "../validation.js";
import { toDateKey } from "../domain/dateKey.js";

export const dailySummaryRouter = Router();

dailySummaryRouter.get("/daily-summary", async (req, res) => {
  const date = req.query.date ? requireDateKey(req.query.date, "Ngày") : toDateKey(new Date());
  res.json(await getDailySummary(req.user.id, date));
});
