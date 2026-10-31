import { Router } from "express";
import { getStreak } from "../services/streakService.js";

export const streakRouter = Router();

streakRouter.get("/streak", async (req, res) => {
  res.json(await getStreak(req.user.id));
});
