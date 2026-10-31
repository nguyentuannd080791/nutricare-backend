import { Router } from "express";
import { getWorkoutPlan } from "../services/workoutPlanService.js";
import { requireDateKey } from "../validation.js";
import { toDateKey } from "../domain/dateKey.js";

export const workoutPlanRouter = Router();

workoutPlanRouter.get("/workout-plan", async (req, res) => {
  const date = req.query.date ? requireDateKey(req.query.date, "Ngày") : toDateKey(new Date());
  res.json(await getWorkoutPlan(req.user.id, date));
});
