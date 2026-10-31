import { findExercise, calcBurnedKcal } from "./exerciseCalories.js";

const LIGHT_MAX_MET = 3.5;
const MODERATE_MAX_MET = 6;

// Bài tập đi kèm mỗi ngày theo mục tiêu. Có thể chỉnh số liệu ở đây, không cần sửa logic.
export const WORKOUT_TEMPLATES = {
  giam_can: [
    { exerciseId: "brisk_walking", time: "06:15", minutes: 30 },
    { exerciseId: "jogging", time: "17:30", minutes: 20 },
  ],
  giu_dang: [
    { exerciseId: "brisk_walking", time: "06:15", minutes: 30 },
    { exerciseId: "yoga", time: "18:00", minutes: 20 },
  ],
  tang_can: [
    { exerciseId: "walking", time: "06:30", minutes: 20 },
    { exerciseId: "strength", time: "17:30", minutes: 40 },
  ],
  tang_co: [
    { exerciseId: "brisk_walking", time: "06:30", minutes: 20 },
    { exerciseId: "strength", time: "17:30", minutes: 45 },
  ],
};

export function getWorkoutTemplate(goalId) {
  return WORKOUT_TEMPLATES[goalId] || [];
}

export function intensityLabel(met) {
  if (met <= LIGHT_MAX_MET) return "Nhẹ";
  if (met < MODERATE_MAX_MET) return "Trung bình";
  return "Cao";
}

export function buildWorkoutPlan({ goalId, weightKg }) {
  const workouts = [];
  let plannedKcal = 0;
  for (const item of getWorkoutTemplate(goalId)) {
    const exercise = findExercise(item.exerciseId);
    const kcal = calcBurnedKcal({ met: exercise.met, weightKg, minutes: item.minutes });
    plannedKcal += kcal;
    workouts.push({
      exerciseId: item.exerciseId,
      label: exercise.label,
      time: item.time,
      minutes: item.minutes,
      plannedKcal: kcal,
      intensity: intensityLabel(exercise.met),
    });
  }
  return { workouts, plannedKcal };
}

export function sumMinutesByExercise(logs) {
  const totals = new Map();
  for (const log of logs) {
    totals.set(log.exerciseId, (totals.get(log.exerciseId) || 0) + log.minutes);
  }
  return totals;
}

// Một bài đi kèm coi là xong khi tổng số phút đã ghi cho đúng bài đó đạt số phút kế hoạch.
export function markCompletion(workouts, logs) {
  const totals = sumMinutesByExercise(logs);
  return workouts.map((workout) => {
    const logIds = [];
    for (const log of logs) {
      if (log.exerciseId === workout.exerciseId) logIds.push(log.id);
    }
    return { ...workout, completed: (totals.get(workout.exerciseId) || 0) >= workout.minutes, logIds };
  });
}

export function countCompletedWorkouts(goalId, minutesByExercise) {
  let done = 0;
  for (const item of getWorkoutTemplate(goalId)) {
    if ((minutesByExercise.get(item.exerciseId) || 0) >= item.minutes) done += 1;
  }
  return done;
}
