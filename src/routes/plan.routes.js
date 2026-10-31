import { Router } from "express";
import { enforceAiPlanLimit } from "../middleware/usageLimits.js";
import { listPlans, generatePlan, swapMeal, swapItem, proposeDiversifiedPlan, applyDiversification } from "../services/planService.js";
import { HttpError } from "../errors.js";
import { requireInteger, requireText } from "../validation.js";

export const planRouter = Router();

const MAX_PLAN_DAYS = 14;
const MEAL_SLOTS_PER_DAY = 4;

planRouter.get("/plan/history", async (req, res) => {
  res.json(await listPlans(req.user.id));
});

planRouter.post("/plan/generate", async (req, res) => {
  const days = requireInteger(req.body.days ?? 7, { min: 1, max: MAX_PLAN_DAYS, label: "Số ngày" });
  res.status(201).json(await generatePlan(req.user, days));
});

// Đổi 1 món con trong mâm cơm (items[itemIndex])
planRouter.post("/plan/swap-item", async (req, res) => {
  const { planId, dayIndex, mealSlot, itemIndex, chooseDishId } = req.body;
  res.json(
    await swapItem(req.user, {
      planId: requireText(planId, { label: "planId", max: 64 }),
      dayIndex: requireInteger(dayIndex, { min: 1, max: MAX_PLAN_DAYS, label: "Ngày" }),
      mealSlot: requireText(mealSlot, { label: "Bữa ăn", max: 20 }),
      itemIndex: requireInteger(itemIndex, { min: 0, max: 10, label: "Vị trí món con" }),
      chooseDishId: requireInteger(chooseDishId, { min: 1, max: Number.MAX_SAFE_INTEGER, label: "Món ăn" }),
    })
  );
});

// Đổi món — tương thích ngược
planRouter.post("/plan/swap", async (req, res) => {
  const { planId, dayIndex, mealSlot, chooseDishId } = req.body;
  res.json(
    await swapMeal(req.user, {
      planId: requireText(planId, { label: "planId", max: 64 }),
      dayIndex: requireInteger(dayIndex, { min: 1, max: MAX_PLAN_DAYS, label: "Ngày" }),
      mealSlot: requireText(mealSlot, { label: "Bữa ăn", max: 20 }),
      chooseDishId: requireInteger(chooseDishId, { min: 1, max: Number.MAX_SAFE_INTEGER, label: "Món ăn" }),
    })
  );
});

// AI chỉ là lớp đa dạng hoá TUỲ CHỌN trên thực đơn đã có — trả đề xuất, chưa lưu.
planRouter.post("/plan/diversify", enforceAiPlanLimit, async (req, res) => {
  const planId = requireText(req.body.planId, { label: "planId", max: 64 });
  res.json(await proposeDiversifiedPlan(req.user, { planId, note: req.body.note }));
});

planRouter.post("/plan/diversify/apply", async (req, res) => {
  const { planId, selections } = req.body;
  if (!Array.isArray(selections) || selections.length === 0 || selections.length > MAX_PLAN_DAYS * MEAL_SLOTS_PER_DAY) {
    throw new HttpError(400, "Danh sách món áp dụng không hợp lệ.");
  }
  const parsed = selections.map((s) => ({
    dayIndex: requireInteger(s?.dayIndex, { min: 1, max: MAX_PLAN_DAYS, label: "Ngày" }),
    mealSlot: requireText(s?.mealSlot, { label: "Bữa ăn", max: 20 }),
    dishId: requireInteger(s?.dishId, { min: 1, max: Number.MAX_SAFE_INTEGER, label: "Món ăn" }),
  }));
  res.status(201).json(await applyDiversification(req.user, { planId: requireText(planId, { label: "planId", max: 64 }), selections: parsed }));
});
