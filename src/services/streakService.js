import { prisma } from "./prismaClient.js";
import { listMealLogs } from "./mealLogService.js";
import { loadGoalTargets } from "./workoutPlanService.js";
import { toDateKey, shiftDateKey } from "../domain/dateKey.js";
import { isRestDay } from "../domain/restDay.js";
import { STREAK_LOOKBACK_DAYS, analyzeStreak, findCompleteDays } from "../domain/streak.js";

function toDbDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function uniquePlanIds(mealLogs) {
  const ids = new Set();
  for (const log of mealLogs) {
    ids.add(log.planId);
  }
  return [...ids];
}

export async function getStreak(userId, now = new Date()) {
  const today = toDateKey(now);
  const from = shiftDateKey(today, -STREAK_LOOKBACK_DAYS);

  const targets = await loadGoalTargets(userId);
  const mealLogs = await listMealLogs(userId, { from, to: today });
  const planIds = uniquePlanIds(mealLogs);
  const plans = planIds.length > 0 ? await prisma.mealPlan.findMany({ where: { userId, id: { in: planIds } } }) : [];

  const rows = await prisma.exerciseLog.findMany({
    where: { userId, logDate: { gte: toDbDate(from), lte: toDbDate(today) } },
  });
  const exerciseLogs = [];
  for (const row of rows) {
    exerciseLogs.push({ date: toDateKey(row.logDate), exerciseId: row.exerciseId, minutes: row.minutes });
  }

  const completeDays = findCompleteDays({ mealLogs, plans, exerciseLogs, targets });
  return analyzeStreak(today, completeDays);
}
