import { isAdminEmail } from "../domain/adminAccess.js";
import { FREE_LIMITS, AVOID_TAG_LABELS } from "../domain/constants.js";
import { calcBMI } from "../domain/bmiLogic.js";
import { rulesForCondition, hasAnyRule } from "../domain/conditionRules.js";

// Hình dạng dữ liệu trả cho client — không bao giờ lộ passwordHash.
export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    gender: user.gender,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
    isPremium: user.isPremium,
    aiPlanCount: user.aiPlanCount,
    scanCount: user.scanCount,
    limits: FREE_LIMITS,
    isAdmin: isAdminEmail(user.email, process.env.ADMIN_EMAILS),
  };
}

export function bmiRecordView(record) {
  return {
    id: record.id,
    date: record.date,
    heightCm: record.heightCm,
    weightKg: record.weightKg,
    bmi: calcBMI(record.heightCm, record.weightKg),
  };
}

// Kết quả nhận diện luôn tính lại từ tên bệnh (luật có thể được cập nhật sau
// khi người dùng đã lưu) — client chỉ hiển thị, không tự suy luận.
export function conditionView(condition) {
  const rules = rulesForCondition(condition.name);
  return {
    id: condition.id,
    name: condition.name,
    type: condition.type,
    addedDate: condition.createdAt,
    tagLabels: rules.excludeTags.map((t) => AVOID_TAG_LABELS[t] ?? t),
    recognized: hasAnyRule(rules),
  };
}
