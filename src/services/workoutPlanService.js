import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { toDateKey } from "../domain/dateKey.js";
import { buildWorkoutPlan, markCompletion } from "../domain/workoutPlanRules.js";
import { findGoalOnDate } from "../domain/streak.js";
import { isRestDay } from "../domain/restDay.js";
import { listExerciseLogs } from "./exerciseLogService.js";
import { findExercise } from "../domain/exerciseCalories.js";

export async function loadGoalTargets(userId) {
  const rows = await prisma.nutritionTarget.findMany({ where: { userId } });
  const targets = [];
  for (const row of rows) {
    targets.push({
      goalId: row.goalId,
      effectiveFrom: toDateKey(row.effectiveFrom),
      effectiveTo: row.effectiveTo ? toDateKey(row.effectiveTo) : null,
    });
  }
  return targets;
}

function sumMinutes(entries) {
  let total = 0;
  for (const entry of entries) {
    total += entry.minutes;
  }
  return total;
}

export async function getWorkoutPlan(userId, date) {
  const [targets, logs, bmi] = await Promise.all([
    loadGoalTargets(userId),
    listExerciseLogs(userId, date),
    prisma.bmiRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
  ]);

  const goalId = findGoalOnDate(targets, date);
  if (!goalId) throw new HttpError(404, "Chưa có mục tiêu dinh dưỡng cho ngày này.");

  const activeMinutes = sumMinutes(logs.entries);

  if (isRestDay(date)) {
    return {
      date,
      goalId,
      restDay: true,
      workouts: [],
      plannedKcal: 0,
      burnedKcal: logs.totalKcal,
      activeMinutes,
      doneCount: 0,
      totalCount: 0,
    };
  }

  if (!bmi) throw new HttpError(400, "Cần nhập cân nặng trước khi xem bài tập đi kèm.");

  const plan = buildWorkoutPlan({ goalId, weightKg: bmi.weightKg });
  const workouts = markCompletion(plan.workouts, logs.entries);

  let doneCount = 0;
  for (const workout of workouts) {
    if (workout.completed) doneCount += 1;
  }

  // Tách các bài tập đã log nhưng không thuộc danh sách bài tập của kế hoạch
  const planExerciseIds = new Set(workouts.map((w) => w.exerciseId));
  const extraWorkouts = [];
  for (const log of logs.entries) {
    if (!planExerciseIds.has(log.exerciseId)) {
      const exercise = findExercise(log.exerciseId);
      extraWorkouts.push({
        id: log.id,
        exerciseId: log.exerciseId,
        label: exercise?.label || log.exerciseId,
        minutes: log.minutes,
        burnedKcal: log.kcal,
        completed: true,
        logIds: [log.id],
      });
    }
  }

  return {
    date,
    goalId,
    restDay: false,
    workouts,
    extraWorkouts,
    plannedKcal: plan.plannedKcal,
    burnedKcal: logs.totalKcal,
    activeMinutes,
    doneCount,
    totalCount: workouts.length,
  };
}
