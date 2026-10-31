import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { listMealLogs } from "./mealLogService.js";
import { listExerciseLogs } from "./exerciseLogService.js";
import { calcDailyBalance, sumKcal } from "../domain/dailyBalance.js";

export async function getDailySummary(userId, date) {
  const target = await prisma.nutritionTarget.findFirst({ where: { userId, isActive: true } });
  if (!target) throw new HttpError(404, "Chưa có mục tiêu dinh dưỡng nào.");

  const meals = await listMealLogs(userId, { from: date, to: date });
  const exercise = await listExerciseLogs(userId, date);

  const balance = calcDailyBalance({
    intakeKcal: sumKcal(meals),
    burnedKcal: exercise.totalKcal,
    targetKcal: target.calories,
  });
  return { date, targetKcal: target.calories, ...balance };
}
