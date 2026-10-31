import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { computeNutritionTarget, planWeightChange, isWeightChangeGoal, shouldRecalculateTarget, getAge } from "../domain/bmiLogic.js";
import { evaluateWeightTrend, computeCalorieAdjustment, isFeedbackCheckDue, diagnoseFeedbackLoop } from "../domain/feedbackLoop.js";
import { DEFAULT_ADMIN_CONFIG, GOALS, ACTIVITY_LEVELS, DURATIONS } from "../domain/constants.js";
import { requireNumber } from "../validation.js";

const HEIGHT_RANGE = { min: 100, max: 230, label: "Chiều cao" };

function assertGoalAndActivity(goalId, activityId) {
  if (!GOALS.some((g) => g.id === goalId)) throw new HttpError(400, "Mục tiêu không hợp lệ.");
  if (!ACTIVITY_LEVELS.some((a) => a.id === activityId)) throw new HttpError(400, "Mức độ vận động không hợp lệ.");
}

// Giới tính + ngày sinh là đầu vào bắt buộc của công thức Mifflin-St Jeor;
// thiếu thì báo lỗi rõ ràng thay vì âm thầm dùng giá trị mặc định.
function assertProfileComplete(user) {
  if (!user.gender || !user.dob) throw new HttpError(409, "Hãy hoàn tất hồ sơ (giới tính, ngày sinh) trước.");
}

const profileOf = (user, bmiRecord) => ({
  gender: user.gender,
  weightKg: bmiRecord.weightKg,
  heightCm: bmiRecord.heightCm,
  age: getAge(user.dob),
});

// Mục tiêu người dùng vừa đặt (onboarding / đổi mục tiêu / xem trước). Với
// giam_can / tang_can, quy đổi "X kg trong N tháng" thành độ lệch calo mỗi ngày
// và từ chối nếu không an toàn; các mục tiêu khác dùng hệ số nhân TDEE.
function computeTargetValues(user, bmiRecord, { goalId, activityId, durationMonths, targetChangeKg }) {
  assertGoalAndActivity(goalId, activityId);
  const profile = { ...profileOf(user, bmiRecord), activityId };
  let plan = { dailyKcalDelta: null, targetWeightKg: null };
  if (isWeightChangeGoal(goalId)) {
    plan = planWeightChange({ ...profile, goalId, changeKg: targetChangeKg, durationMonths });
    if (plan.error) throw new HttpError(400, plan.error);
  }
  return { ...computeNutritionTarget({ ...profile, goalId, dailyKcalDelta: plan.dailyKcalDelta }), ...plan };
}

// Cân nặng đổi đủ ngưỡng: giữ nguyên mục tiêu người dùng đã chọn (kể cả độ lệch
// calo/ngày), chỉ tính lại BMR/TDEE theo cân nặng mới.
function recomputeTargetValues(user, bmiRecord, target) {
  const { goalId, activityId, dailyKcalDelta, targetWeightKg } = target;
  const profile = { ...profileOf(user, bmiRecord), activityId };
  return { ...computeNutritionTarget({ ...profile, goalId, dailyKcalDelta }), dailyKcalDelta, targetWeightKg };
}

// Chiều cao khai báo ở lần ghi đầu tiên là cố định: các lần sau server lấy lại
// giá trị đó và bỏ qua chiều cao client gửi lên.
async function fixedHeightCm(tx, userId, requestedHeightCm) {
  const first = await tx.bmiRecord.findFirst({ where: { userId }, orderBy: { date: "asc" } });
  return first ? first.heightCm : requireNumber(requestedHeightCm, HEIGHT_RANGE);
}

async function latestBmiOrThrow(db, userId) {
  const record = await db.bmiRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } });
  if (!record) throw new HttpError(404, "Chưa có chỉ số BMI nào.");
  return record;
}

// Vô hiệu hoá MỌI bản ghi đang active (không chỉ 1) rồi tạo bản mới — SCD Type 2.
async function replaceActiveTarget(tx, userId, data) {
  await tx.nutritionTarget.updateMany({ where: { userId, isActive: true }, data: { isActive: false, effectiveTo: new Date() } });
  return tx.nutritionTarget.create({ data: { userId, ...data, isActive: true } });
}

export async function previewTarget(user, goal) {
  assertProfileComplete(user);
  return computeTargetValues(user, await latestBmiOrThrow(prisma, user.id), goal);
}

// Người dùng chủ động đổi mục tiêu/hoạt động — luôn tạo target mới ngay.
export async function createTarget(user, goal) {
  const { goalId, activityId, durationMonths } = goal;
  if (!DURATIONS.includes(durationMonths)) throw new HttpError(400, "Thời gian áp dụng không hợp lệ.");
  assertProfileComplete(user);

  return prisma.$transaction(async (tx) => {
    const bmi = await latestBmiOrThrow(tx, user.id);
    const hadActive = (await tx.nutritionTarget.count({ where: { userId: user.id, isActive: true } })) > 0;
    return replaceActiveTarget(tx, user.id, {
      bmiRecordId: bmi.id,
      goalId,
      activityId,
      durationMonths,
      ...computeTargetValues(user, bmi, goal),
      trigger: hadActive ? "manual" : "initial",
      lastTriggerDate: new Date(),
      lastTriggerWeight: bmi.weightKg,
    });
  });
}

// Dữ liệu target mới (chưa gồm các cột SCD), hoặc null nếu chưa đủ thông tin để
// tạo. Đã có target → giữ nguyên mục tiêu, tính lại theo cân nặng mới. Chưa có
// (lần ghi đầu, onboarding) → dùng mục tiêu người dùng vừa khai báo.
function nextTargetData(user, record, target, goal) {
  if (target) {
    const { goalId, activityId, durationMonths } = target;
    return { goalId, activityId, durationMonths, ...recomputeTargetValues(user, record, target), trigger: "bmi_change" };
  }
  if (!goal.goalId || !goal.activityId) return null;
  return {
    goalId: goal.goalId,
    activityId: goal.activityId,
    durationMonths: isWeightChangeGoal(goal.goalId) ? goal.durationMonths : null,
    ...computeTargetValues(user, record, goal),
    trigger: "initial",
  };
}

// Ghi 1 chỉ số cân nặng mới. Server tự quyết định có tạo lại target hay không
// (mô hình 2 trục thời gian + % cân nặng) — client không gửi quyết định tính
// sẵn. Lần ghi đầu tiên (onboarding) nhận thêm chiều cao (cố định từ đó về sau)
// và mục tiêu đầu tiên `goal` = { goalId, activityId, durationMonths, targetChangeKg }.
export async function recordBmi(user, { weightKg, heightCm, goal = {} }) {
  assertProfileComplete(user);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const record = await tx.bmiRecord.create({
      data: { userId: user.id, date: now, heightCm: await fixedHeightCm(tx, user.id, heightCm), weightKg, gender: user.gender, dob: user.dob },
    });
    let target = await tx.nutritionTarget.findFirst({ where: { userId: user.id, isActive: true } });

    const decision = shouldRecalculateTarget({
      lastTriggerDate: target?.lastTriggerDate ?? null,
      lastTriggerWeight: target?.lastTriggerWeight ?? null,
      newDate: now,
      newWeight: weightKg,
      config: DEFAULT_ADMIN_CONFIG,
    });

    let targetRecalculated = false;
    const next = decision.trigger ? nextTargetData(user, record, target, goal) : null;
    if (next) {
      target = await replaceActiveTarget(tx, user.id, { bmiRecordId: record.id, ...next, lastTriggerDate: now, lastTriggerWeight: weightKg });
      targetRecalculated = true;
    }

    let calorieAdjustment = 0;
    let feedbackLoop = null;
    if (target) {
      ({ target, calorieAdjustment, feedbackLoop } = await applyFeedbackLoop(tx, user.id, target, Boolean(user.isPremium), now));
    }

    return { record, targetRecalculated, decision, target, calorieAdjustment, feedbackLoop };
  });
}

// GIAI ĐOẠN 5 (Premium) — chạy tối đa 1 lần/7 ngày (isFeedbackCheckDue): nếu xu
// hướng cân nặng lệch mục tiêu thì nắn ±125 kcal. Trục điều chỉnh RIÊNG với
// việc tính lại BMR/TDEE ở trên — không tính lại toàn bộ target.
async function applyFeedbackLoop(tx, userId, target, isPremium, now) {
  const bmiRecords = await tx.bmiRecord.findMany({ where: { userId } });
  const feedbackLoop = diagnoseFeedbackLoop({ bmiRecords, target, isPremium, now });

  if (feedbackLoop.isDue && (feedbackLoop.status === "adjusted" || feedbackLoop.status === "on_track")) {
    const data = { lastFeedbackCheckAt: now };
    if (feedbackLoop.calorieAdjustment !== 0) {
      data.calories = target.calories + feedbackLoop.calorieAdjustment;
    }
    const updated = await tx.nutritionTarget.update({
      where: { id: target.id },
      data,
    });
    return { target: updated, calorieAdjustment: feedbackLoop.calorieAdjustment, feedbackLoop };
  }

  return { target, calorieAdjustment: 0, feedbackLoop };
}

export async function getActiveFeedbackStatus(userId, isPremium) {
  const [target, bmiRecords] = await Promise.all([
    prisma.nutritionTarget.findFirst({ where: { userId, isActive: true } }),
    prisma.bmiRecord.findMany({ where: { userId } }),
  ]);
  return diagnoseFeedbackLoop({ bmiRecords, target, isPremium });
}
