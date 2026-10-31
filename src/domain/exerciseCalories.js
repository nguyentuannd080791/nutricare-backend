import { EXERCISES } from "./constants.js";

const RESTING_MET = 1;

export function findExercise(exerciseId) {
  return EXERCISES.find((exercise) => exercise.id === exerciseId) || null;
}

export function calcBurnedKcal({ met, weightKg, minutes }) {
  const extraMet = met - RESTING_MET;
  const hours = minutes / 60;
  return Math.round(extraMet * weightKg * hours);
}
