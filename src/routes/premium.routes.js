import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { publicUser } from "../services/serializers.js";

export const premiumRouter = Router();

// Mock paywall — KHÔNG có thanh toán thật, chỉ đổi cờ isPremium trong DB.
const setPremium = (isPremium) => async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { isPremium } });
  res.json(publicUser(user));
};

premiumRouter.post("/premium/mock-upgrade", setPremium(true));
premiumRouter.post("/premium/mock-cancel", setPremium(false));
