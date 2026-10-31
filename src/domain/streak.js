import { shiftDateKey } from "./dateKey.js";
import { isRestDay } from "./restDay.js";
import { getWorkoutTemplate, countCompletedWorkouts } from "./workoutPlanRules.js";

export const STREAK_LOOKBACK_DAYS = 365;

// Một ngày đạt khi ăn đủ mọi bữa trong thực đơn VÀ làm đủ mọi bài đi kèm. Ngày không có kế hoạch thì không đạt.
export function isDayComplete({ mealsEaten, mealsPlanned, workoutsDone, workoutsPlanned }) {
  if (mealsPlanned === 0 || workoutsPlanned === 0) return false;
  return mealsEaten >= mealsPlanned && workoutsDone >= workoutsPlanned;
}

// Hôm nay đạt thì cộng thêm 1; hôm nay chưa đạt thì chuỗi vẫn giữ đến hết ngày.
// Ngày nghỉ không cộng và cũng không làm mất chuỗi.
export function calcCurrentStreak(todayKey, completeDays) {
  let streak = completeDays.has(todayKey) ? 1 : 0;
  for (let daysAgo = 1; daysAgo <= STREAK_LOOKBACK_DAYS; daysAgo += 1) {
    const cursor = shiftDateKey(todayKey, -daysAgo);
    if (isRestDay(cursor)) continue;
    if (!completeDays.has(cursor)) break;
    streak += 1;
  }
  return streak;
}

export function analyzeStreak(todayKey, completeDays) {
  const current = calcCurrentStreak(todayKey, completeDays);
  const todayComplete = completeDays.has(todayKey);
  const todayRest = isRestDay(todayKey);

  const yesterdayKey = shiftDateKey(todayKey, -1);
  const yesterdayRest = isRestDay(yesterdayKey);
  const yesterdayComplete = completeDays.has(yesterdayKey);

  let brokeYesterday = false;
  let lostStreak = 0;
  if (!yesterdayRest && !yesterdayComplete) {
    const dayBeforeYesterday = shiftDateKey(todayKey, -2);
    const priorStreak = calcCurrentStreak(dayBeforeYesterday, completeDays);
    if (priorStreak > 0) {
      brokeYesterday = true;
      lostStreak = priorStreak;
    }
  }

  return {
    current,
    todayComplete,
    todayRest,
    yesterdayComplete: yesterdayRest ? true : yesterdayComplete,
    brokeYesterday,
    lostStreak,
  };
}

// targets: [{ goalId, effectiveFrom: "YYYY-MM-DD", effectiveTo: "YYYY-MM-DD" | null }]
export function findGoalOnDate(targets, dateKey) {
  for (const target of targets) {
    const started = target.effectiveFrom <= dateKey;
    const notEnded = target.effectiveTo === null || dateKey < target.effectiveTo;
    if (started && notEnded) return target.goalId;
  }
  return null;
}

function countPlannedMeals(plan, dayIndex) {
  if (!plan || !Array.isArray(plan.days)) return 0;
  const day = plan.days.find((item) => item.dayIndex === dayIndex);
  return day?.meals?.length || 0;
}

function groupMealLogsByDate(mealLogs) {
  const byDate = new Map();
  for (const log of mealLogs) {
    if (!byDate.has(log.date)) byDate.set(log.date, []);
    byDate.get(log.date).push(log);
  }
  return byDate;
}

function groupMinutesByDate(exerciseLogs) {
  const byDate = new Map();
  for (const log of exerciseLogs) {
    if (!byDate.has(log.date)) byDate.set(log.date, new Map());
    const minutes = byDate.get(log.date);
    minutes.set(log.exerciseId, (minutes.get(log.exerciseId) || 0) + log.minutes);
  }
  return byDate;
}

// mealLogs: [{ date, planId, dayIndex }], plans: [{ id, days }], exerciseLogs: [{ date, exerciseId, minutes }]
export function findCompleteDays({ mealLogs, plans, exerciseLogs, targets }) {
  const complete = new Set();
  const minutesByDate = groupMinutesByDate(exerciseLogs);

  for (const [date, logs] of groupMealLogsByDate(mealLogs)) {
    if (isRestDay(date)) continue;
    const last = logs[logs.length - 1];
    const plan = plans.find((item) => item.id === last.planId);
    let mealsEaten = 0;
    for (const log of logs) {
      if (log.planId === last.planId && log.dayIndex === last.dayIndex) mealsEaten += 1;
    }

    const goalId = findGoalOnDate(targets, date);
    const workoutsPlanned = goalId ? getWorkoutTemplate(goalId).length : 0;
    const workoutsDone = goalId ? countCompletedWorkouts(goalId, minutesByDate.get(date) || new Map()) : 0;

    const dayComplete = isDayComplete({
      mealsEaten,
      mealsPlanned: countPlannedMeals(plan, last.dayIndex),
      workoutsDone,
      workoutsPlanned,
    });
    if (dayComplete) complete.add(date);
  }
  return complete;
}
