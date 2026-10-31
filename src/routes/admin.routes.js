import { Router } from "express";
import { getAdminStats } from "../services/adminStatsService.js";
import { listUsers, getUserDetail } from "../services/adminUserService.js";
import { requireInteger, parseAdminUsersQuery } from "../validation.js";
import { ADHERENCE_CONFIG } from "../domain/constants.js";

export const adminRouter = Router();

adminRouter.get("/stats", async (req, res) => {
  const days = requireInteger(req.query.days ? Number(req.query.days) : ADHERENCE_CONFIG.statsDefaultDays, {
    min: 1,
    max: ADHERENCE_CONFIG.statsMaxDays,
    label: "Số ngày",
  });
  res.json(await getAdminStats(days));
});

adminRouter.get("/users", async (req, res) => {
  const query = parseAdminUsersQuery(req.query);
  res.json(await listUsers(query));
});

adminRouter.get("/users/:id", async (req, res) => {
  const adminEmail = req.user?.email || "unknown";
  res.json(await getUserDetail(req.params.id, adminEmail));
});

