import { matchConditionTags, matchConditionNutrientLimits } from "./constants.js";
import { resolveMedicalConditionKeys, validateItemMedicalRules } from "./medicalRules.js";

// Điểm DUY NHẤT quyết định "món này có hợp với bệnh nền/dị ứng này không" —
// dùng chung cho lọc thực đơn, kiểm tra kết quả AI, cảnh báo khi quét/tra cứu.
// Một bộ luật (rules) gồm 3 lớp: tag dị ứng, ngưỡng dinh dưỡng, danh sách cấm y khoa.

export function rulesForCondition(name) {
  return {
    excludeTags: matchConditionTags(name),
    conditionLimits: matchConditionNutrientLimits(name),
    userConditions: resolveMedicalConditionKeys(name),
  };
}

// Gộp luật của TOÀN BỘ bệnh nền của user; ngưỡng dinh dưỡng lấy mức chặt nhất.
export function mergeRules(rulesList) {
  const excludeTags = new Set();
  const userConditions = new Set();
  const conditionLimits = {};
  for (const rules of rulesList) {
    rules.excludeTags.forEach((t) => excludeTags.add(t));
    rules.userConditions.forEach((k) => userConditions.add(k));
    for (const [field, max] of Object.entries(rules.conditionLimits)) {
      conditionLimits[field] = Math.min(conditionLimits[field] ?? Infinity, max);
    }
  }
  return { excludeTags: [...excludeTags], conditionLimits, userConditions: [...userConditions] };
}

export function isDishAllowed(dish, { excludeTags, conditionLimits, userConditions }) {
  if (userConditions.length > 0 && validateItemMedicalRules(dish, userConditions).isBanned) return false;
  if ((dish.tags || []).some((t) => excludeTags.includes(t))) return false;
  return Object.entries(conditionLimits).every(([field, max]) => dish[field] == null || dish[field] <= max);
}

// Tên các bệnh nền/dị ứng mà món này xung đột — để giải thích cho người dùng.
export function findConflictingConditions(dish, conditions) {
  return conditions.filter((c) => !isDishAllowed(dish, rulesForCondition(c.name))).map((c) => c.name);
}

// Bệnh nền này có được hệ thống nhận diện (có ít nhất 1 luật áp dụng) hay không.
export function hasAnyRule(rules) {
  return rules.excludeTags.length > 0 || rules.userConditions.length > 0 || Object.keys(rules.conditionLimits).length > 0;
}
