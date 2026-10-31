import {
  GOALS,
  ACTIVITY_LEVELS,
  DURATIONS,
  WEIGHT_CHANGE_RULES,
  WEIGHT_CHANGE_KG_RANGE,
  KCAL_PER_KG,
  DAYS_PER_MONTH,
} from "./constants.js";

// Toàn bộ hàm trong file này là pure function (cùng input -> cùng output,
// không side-effect) — cố ý để dễ viết unit test độc lập, không cần DB.

export function calcBMI(heightCm, weightKg) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function getAge(dobStr) {
  if (!dobStr) return 30;
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(age, 1);
}

// Công thức Mifflin-St Jeor
export function calcBMR({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "nam" ? base + 5 : base - 161;
}

export function calcTdee({ gender, weightKg, heightCm, age, activityId }) {
  const activity = ACTIVITY_LEVELS.find((a) => a.id === activityId) || ACTIVITY_LEVELS[0];
  return calcBMR({ gender, weightKg, heightCm, age }) * activity.factor;
}

export const isWeightChangeGoal = (goalId) => Object.hasOwn(WEIGHT_CHANGE_RULES, goalId);

// Quy đổi "giảm/tăng X kg trong N tháng" thành độ lệch calo mỗi ngày, hoặc trả
// { error } nếu mục tiêu không an toàn. Thứ tự kiểm tra: khoảng số cân → tốc độ
// → BMI cân nặng mục tiêu → sàn calo. Chỉ dùng khi người dùng đặt mục tiêu mới
// (khi tính lại theo cân nặng, giữ nguyên độ lệch đã lưu).
export function planWeightChange({ goalId, changeKg, durationMonths, ...profile }) {
  const rule = WEIGHT_CHANGE_RULES[goalId];
  const { min, max } = WEIGHT_CHANGE_KG_RANGE;
  if (!Number.isFinite(changeKg) || changeKg < min || changeKg > max) {
    return { error: `Số cân muốn ${rule.verb} cần từ ${min}–${max}kg.` };
  }
  if (!DURATIONS.includes(durationMonths)) return { error: "Thời gian áp dụng không hợp lệ." };

  const days = durationMonths * DAYS_PER_MONTH;
  const maxKgForDuration = Math.floor(((rule.maxKgPerWeek * days) / 7) * 10) / 10;
  if (changeKg > maxKgForDuration) {
    return { error: `Trong ${durationMonths} tháng bạn chỉ nên ${rule.verb} tối đa ${maxKgForDuration}kg (${rule.maxKgPerWeek}kg/tuần). Hãy chọn thời gian dài hơn hoặc ${rule.verb} ít hơn.` };
  }

  const targetWeightKg = Math.round((profile.weightKg + rule.direction * changeKg) * 10) / 10;
  const targetBmi = calcBMI(profile.heightCm, targetWeightKg);
  const breachesBmiLimit = rule.direction < 0 ? targetBmi < rule.bmiLimit : targetBmi > rule.bmiLimit;
  if (breachesBmiLimit) {
    return { error: `Cân nặng mục tiêu ${targetWeightKg}kg cho BMI ${targetBmi.toFixed(1)}, ${rule.direction < 0 ? "dưới" : "vượt"} ngưỡng an toàn ${rule.bmiLimit}. Hãy chọn số cân ${rule.verb} ít hơn.` };
  }

  const dailyKcalDelta = rule.direction * Math.round((changeKg * KCAL_PER_KG) / days);
  const minCalories = rule.minCalories?.[profile.gender];
  const calories = Math.round(calcTdee(profile)) + dailyKcalDelta;
  if (minCalories && calories < minCalories) {
    return { error: `Mục tiêu này chỉ còn ${calories} kcal/ngày, dưới mức tối thiểu an toàn ${minCalories} kcal. Hãy ${rule.verb} ít hơn hoặc kéo dài thời gian.` };
  }
  return { dailyKcalDelta, targetWeightKg };
}

// dailyKcalDelta chỉ dùng cho mục tiêu theo số cân (giam_can / tang_can).
export function computeNutritionTarget({ gender, weightKg, heightCm, age, goalId, activityId, dailyKcalDelta }) {
  const goal = GOALS.find((g) => g.id === goalId) || GOALS[1];
  const bmr = calcBMR({ gender, weightKg, heightCm, age });
  const tdee = calcTdee({ gender, weightKg, heightCm, age, activityId });
  const weightRule = WEIGHT_CHANGE_RULES[goal.id];
  // Sàn calo giữ an toàn khi cân nặng giảm làm TDEE tụt mà độ lệch đã lưu không đổi.
  const calories = weightRule
    ? Math.max(Math.round(tdee + dailyKcalDelta), weightRule.minCalories?.[gender] ?? 0)
    : Math.round(tdee * goal.factor);

  let proteinPerKg = 1.4;
  if (goal.id === "tang_co") proteinPerKg = 2.0;
  else if (goal.id === "giam_can") proteinPerKg = 1.8;
  else if (goal.id === "tang_can") proteinPerKg = 1.6;

  const protein = Math.round(proteinPerKg * weightKg);
  const fatCalories = calories * 0.25;
  const fat = Math.round(fatCalories / 9);
  const proteinCalories = protein * 4;
  const carbCalories = Math.max(calories - fatCalories - proteinCalories, 0);
  const carb = Math.round(carbCalories / 4);
  const fiber = Math.round((calories / 1000) * 14);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carb, fat, fiber };
}

// Mô hình 2 trục: chỉ tạo target mới khi ĐỦ CẢ khoảng cách thời gian tối
// thiểu VÀ mức thay đổi cân nặng tối thiểu (đơn vị % so với lần trigger
// trước) — tránh tạo version target liên tục vì dao động cân nặng nhỏ.
export function shouldRecalculateTarget({ lastTriggerDate, lastTriggerWeight, newDate, newWeight, config }) {
  if (!lastTriggerDate || lastTriggerWeight == null) return { trigger: true, reason: "no_baseline" };
  const days = (new Date(newDate) - new Date(lastTriggerDate)) / 86400000;
  const pctChange = (Math.abs(newWeight - lastTriggerWeight) / lastTriggerWeight) * 100;
  const meetsTime = days >= config.minIntervalDays;
  const meetsMagnitude = pctChange >= config.thresholdPercent;
  return { trigger: meetsTime && meetsMagnitude, days, pctChange, meetsTime, meetsMagnitude };
}
