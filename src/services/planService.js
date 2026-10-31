import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { generateDishMealPlan, applySwap, applyItemSwap, applyDishSelections, filterEligibleDishes } from "../domain/dishPlanLogic.js";
import { pickBodyProfileTemplate } from "../domain/constants.js";
import { loadDishPool, loadGroupNames, toCatalogEntries } from "./dishCatalog.js";
import { loadUserRules } from "./conditionService.js";
import { incrementAiPlanCount } from "./usageService.js";
import { proposeDiversification } from "./aiGateway.js";

async function activePlanOrThrow(userId, planId) {
  const plan = await prisma.mealPlan.findFirst({ where: { id: planId, userId, isActive: true } });
  if (!plan) throw new HttpError(404, "Không tìm thấy thực đơn đang áp dụng.");
  return plan;
}

// Chỉ 1 thực đơn active/user: kết thúc bản cũ rồi tạo bản mới trong cùng transaction.
function replaceActivePlan(userId, data) {
  return prisma.$transaction(async (tx) => {
    await tx.mealPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false, endedAt: new Date() } });
    return tx.mealPlan.create({ data: { userId, ...data, isActive: true } });
  });
}

export function listPlans(userId) {
  return prisma.mealPlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

// Thuật toán (deterministic) — LUÔN là ground truth, không giới hạn Premium.
// Server tự đọc calo/mục tiêu từ target đang active, không nhận từ client.
export async function generatePlan(user, days) {
  const target = await prisma.nutritionTarget.findFirst({ where: { userId: user.id, isActive: true } });
  if (!target) throw new HttpError(409, "Cần có mục tiêu dinh dưỡng trước khi tạo thực đơn.");

  const [rules, pool] = await Promise.all([loadUserRules(user.id), loadDishPool()]);
  const template = pickBodyProfileTemplate(target.calories, target.goalId);
  const result = generateDishMealPlan({ pool, targetCalories: target.calories, days, rules, template, goalId: target.goalId });
  if (result.warning) throw new HttpError(422, result.warning);

  return replaceActivePlan(user.id, { source: "algorithm", goalId: target.goalId, days: result.days, caloriesAtCreation: target.calories });
}

// Đổi 1 món con trong mâm cơm (items[itemIndex])
export async function swapItem(user, { planId, dayIndex, mealSlot, itemIndex, chooseDishId }) {
  const plan = await activePlanOrThrow(user.id, planId);
  const day = plan.days.find((d) => d.dayIndex === dayIndex);
  const mealIndex = day?.meals.findIndex((m) => m.mealSlot === mealSlot) ?? -1;
  if (mealIndex === -1) throw new HttpError(404, "Không tìm thấy bữa ăn tương ứng trong thực đơn.");

  const result = applyItemSwap(day.meals[mealIndex], itemIndex, chooseDishId);
  if (!result.ok) throw new HttpError(400, result.error);

  day.meals[mealIndex] = result.meal;
  day.totalKcal = Math.round(day.meals.reduce((s, m) => s + (m.kcal || 0), 0) * 10) / 10;
  return prisma.mealPlan.update({ where: { id: plan.id }, data: { days: plan.days } });
}

export async function swapMeal(user, { planId, dayIndex, mealSlot, chooseDishId }) {
  const plan = await activePlanOrThrow(user.id, planId);
  const day = plan.days.find((d) => d.dayIndex === dayIndex);
  const mealIndex = day?.meals.findIndex((m) => m.mealSlot === mealSlot) ?? -1;
  if (mealIndex === -1) throw new HttpError(404, "Không tìm thấy bữa ăn tương ứng trong thực đơn.");

  const result = applySwap(day.meals[mealIndex], chooseDishId);
  if (!result.ok) throw new HttpError(400, result.error);

  day.meals[mealIndex] = result.meal;
  day.totalKcal = Math.round(day.meals.reduce((s, m) => s + (m.kcal || 0), 0) * 10) / 10;
  return prisma.mealPlan.update({ where: { id: plan.id }, data: { days: plan.days } });
}

const toAiDays = (days) =>
  days.map((d) => ({
    day_index: d.dayIndex,
    meals: d.meals.map((m) => ({ meal_slot: m.mealSlot, dish_id: m.dishId, name: m.nameVi, kcal: m.kcal })),
  }));

// AI trả về dish_id thô → chỉ giữ cặp (ngày, bữa) hợp lệ về mặt cấu trúc; việc
// dish_id có hợp với hồ sơ hay không do applyDishSelections kiểm tra lại.
function aiSelections(aiDays) {
  const selections = new Map();
  for (const day of Array.isArray(aiDays) ? aiDays : []) {
    for (const meal of Array.isArray(day?.meals) ? day.meals : []) {
      const dishId = Number(meal?.dish_id);
      if (Number.isInteger(day.day_index) && typeof meal?.meal_slot === "string" && Number.isInteger(dishId)) {
        selections.set(`${day.day_index}:${meal.meal_slot}`, dishId);
      }
    }
  }
  return selections;
}

async function loadEligiblePool(userId) {
  const [rules, pool] = await Promise.all([loadUserRules(userId), loadDishPool()]);
  return filterEligibleDishes(pool, rules);
}

// AI chỉ là lớp đa dạng hoá TUỲ CHỌN trên thực đơn đã có — không bao giờ là
// nguồn plan chính. Trả ĐỀ XUẤT (chưa lưu); người dùng xác nhận qua applyDiversification.
export async function proposeDiversifiedPlan(user, { planId, note }) {
  const plan = await activePlanOrThrow(user.id, planId);
  const [eligible, groupNames] = await Promise.all([loadEligiblePool(user.id), loadGroupNames()]);

  const ai = await proposeDiversification(
    { currentDays: toAiDays(plan.days), targetCalories: plan.caloriesAtCreation, goalId: plan.goalId, note },
    toCatalogEntries(eligible, groupNames)
  );
  await incrementAiPlanCount(user.id);
  if (ai.status !== "ok") return { status: ai.status, analysis: "", changedCount: 0, days: [] };

  const { days } = applyDishSelections({
    baseDays: plan.days,
    selections: aiSelections(ai.days),
    eligible,
    targetCalories: plan.caloriesAtCreation,
    template: pickBodyProfileTemplate(plan.caloriesAtCreation, plan.goalId),
  });

  let changedCount = 0;
  const annotated = days.map((day, di) => ({
    ...day,
    meals: day.meals.map((meal, mi) => {
      const before = plan.days[di].meals[mi];
      const changed = before.dishId !== meal.dishId;
      if (changed) changedCount += 1;
      return { ...meal, changed, previousNameVi: changed ? before.nameVi : null };
    }),
  }));
  return { status: "ok", analysis: typeof ai.analysis === "string" ? ai.analysis : "", changedCount, days: annotated };
}

// selections: [{ dayIndex, mealSlot, dishId }] — server dựng lại toàn bộ dữ liệu
// món từ bể đã lọc; chỉ dishId được lấy từ client và bị kiểm tra nghiêm ngặt.
export async function applyDiversification(user, { planId, selections }) {
  const plan = await activePlanOrThrow(user.id, planId);
  const selectionMap = new Map(selections.map((s) => [`${s.dayIndex}:${s.mealSlot}`, s.dishId]));

  const result = applyDishSelections({
    baseDays: plan.days,
    selections: selectionMap,
    eligible: await loadEligiblePool(user.id),
    targetCalories: plan.caloriesAtCreation,
    template: pickBodyProfileTemplate(plan.caloriesAtCreation, plan.goalId),
    strict: true,
  });
  if (!result.ok) throw new HttpError(400, result.error);

  return replaceActivePlan(user.id, { source: "ai", goalId: plan.goalId, days: result.days, caloriesAtCreation: plan.caloriesAtCreation });
}
