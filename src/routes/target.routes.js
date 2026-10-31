import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { createTarget, previewTarget } from "../services/targetService.js";
import { HttpError } from "../errors.js";

export const targetRouter = Router();

// Lịch sử mục tiêu (mới nhất trước) — gồm cả bản không còn active.
targetRouter.get("/nutrition-targets", async (req, res) => {
  res.json(await prisma.nutritionTarget.findMany({ where: { userId: req.user.id }, orderBy: { effectiveFrom: "desc" } }));
});

targetRouter.get("/nutrition-targets/active", async (req, res) => {
  const target = await prisma.nutritionTarget.findFirst({ where: { userId: req.user.id, isActive: true } });
  if (!target) throw new HttpError(404, "Chưa có mục tiêu dinh dưỡng nào.");
  res.json(target);
});

// Xem trước kết quả tính toán (chưa lưu) — công thức chỉ tồn tại ở server.
targetRouter.post("/nutrition-targets/preview", async (req, res) => {
  const { goalId, activityId, durationMonths, targetChangeKg } = req.body;
  res.json(await previewTarget(req.user, { goalId, activityId, durationMonths, targetChangeKg }));
});

targetRouter.post("/nutrition-targets", async (req, res) => {
  const { goalId, activityId, durationMonths, targetChangeKg } = req.body;
  res.status(201).json(await createTarget(req.user, { goalId, activityId, durationMonths, targetChangeKg }));
});
