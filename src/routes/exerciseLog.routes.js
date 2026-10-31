import { Router } from "express";
import { addExerciseLog, listExerciseLogs, deleteExerciseLog } from "../services/exerciseLogService.js";
import { requireInteger, requireText, requireDateKey } from "../validation.js";
import { toDateKey } from "../domain/dateKey.js";
import { EXERCISES, EXERCISE_LIMITS } from "../domain/constants.js";

export const exerciseLogRouter = Router();

exerciseLogRouter.get("/exercises", (_req, res) => {
  const list = [];
  for (const exercise of EXERCISES) {
    list.push({ id: exercise.id, label: exercise.label });
  }
  res.json(list);
});

exerciseLogRouter.get("/exercise-logs", async (req, res) => {
  const date = req.query.date ? requireDateKey(req.query.date, "Ngày") : toDateKey(new Date());
  res.json(await listExerciseLogs(req.user.id, date));
});

exerciseLogRouter.post("/exercise-logs", async (req, res) => {
  const exerciseId = requireText(req.body.exerciseId, { label: "Bài tập", max: 40 });
  const minutes = requireInteger(req.body.minutes, {
    min: EXERCISE_LIMITS.minMinutes,
    max: EXERCISE_LIMITS.maxMinutesPerEntry,
    label: "Số phút",
  });
  const date = req.body.date ? requireDateKey(req.body.date, "Ngày") : null;
  const log = await addExerciseLog(req.user, { exerciseId, minutes, date });
  res.status(201).json(log);
});

exerciseLogRouter.delete("/exercise-logs/:id", async (req, res) => {
  const date = req.query.date ? requireDateKey(req.query.date, "Ngày") : null;
  await deleteExerciseLog(req.user.id, req.params.id, date);
  res.status(204).end();
});
