import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { recordBmi, getActiveFeedbackStatus } from "../services/targetService.js";
import { bmiRecordView } from "../services/serializers.js";
import { requireNumber } from "../validation.js";

export const bmiRouter = Router();

bmiRouter.get("/bmi-records", async (req, res) => {
  const records = await prisma.bmiRecord.findMany({ where: { userId: req.user.id }, orderBy: { date: "desc" } });
  res.json(records.map(bmiRecordView));
});

bmiRouter.get("/bmi-records/feedback-status", async (req, res) => {
  res.json(await getActiveFeedbackStatus(req.user.id, Boolean(req.user.isPremium)));
});

// Ghi 1 cân nặng mới; server tự quyết định có tạo lại mục tiêu dinh dưỡng hay
// không (xem targetService.recordBmi). Chiều cao chỉ nhận ở lần ghi đầu tiên
// (sau đó cố định, bị bỏ qua); mục tiêu (goalId, activityId, durationMonths,
// targetChangeKg) cũng chỉ cần ở lần đầu.
bmiRouter.post("/bmi-records", async (req, res) => {
  const weightKg = requireNumber(req.body.weightKg, { min: 25, max: 250, label: "Cân nặng" });
  const { heightCm, goalId, activityId, durationMonths, targetChangeKg } = req.body;

  const { record, targetRecalculated, decision, target, calorieAdjustment, feedbackLoop } = await recordBmi(req.user, {
    weightKg,
    heightCm,
    goal: { goalId, activityId, durationMonths, targetChangeKg },
  });
  res.status(201).json({ record: bmiRecordView(record), targetRecalculated, decision, target, calorieAdjustment, feedbackLoop });
});
