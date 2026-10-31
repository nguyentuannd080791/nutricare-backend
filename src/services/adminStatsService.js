import { prisma } from "./prismaClient.js";
import { buildAdminStats } from "../domain/adminStats.js";
import { shiftDateKey, toDateKey } from "../domain/dateKey.js";
import { ADHERENCE_CONFIG } from "../domain/constants.js";

// Chỉ truy vấn; mọi phép tính nằm ở domain/adminStats.js (có test).
// Toàn bộ số liệu là tổng hợp, KHÔNG trả thông tin cá nhân (email, tên, cân nặng...).
export async function getAdminStats(days) {
  const now = new Date();
  const from = shiftDateKey(toDateKey(now), -(days - 1));
  const fromDate = new Date(`${from}T00:00:00.000Z`);

  const [users, premiumUsers, plans, activePlans, newUsers, newPlans, planRows, logRows] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.mealPlan.count(),
    prisma.mealPlan.count({ where: { isActive: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: fromDate } }, select: { createdAt: true } }),
    prisma.mealPlan.findMany({ where: { createdAt: { gte: fromDate } }, select: { createdAt: true } }),
    // Thực đơn còn hiệu lực ở bất kỳ ngày nào trong khoảng [from, now].
    prisma.mealPlan.findMany({
      where: { createdAt: { lte: now }, OR: [{ endedAt: null }, { endedAt: { gte: fromDate } }] },
      select: { id: true, userId: true, createdAt: true, endedAt: true, days: true },
    }),
    prisma.mealLog.findMany({ where: { logDate: { gte: fromDate } }, select: { userId: true, planId: true, logDate: true, dayIndex: true, kcal: true } }),
  ]);

  let paymentRows = [];
  try {
    paymentRows = await prisma.paymentTransaction.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true, plan: true, completedAt: true },
    });
  } catch {
    paymentRows = [];
  }

  const totalRevenue = paymentRows.reduce((sum, p) => sum + (p.amount || 0), 0);

  return buildAdminStats({
    now,
    days,
    ratio: ADHERENCE_CONFIG.dayCompletionKcalRatio,
    totals: { users, premiumUsers, plans, activePlans, totalRevenue, completedPayments: paymentRows.length },
    newUserDates: newUsers.map((u) => u.createdAt),
    newPlanDates: newPlans.map((p) => p.createdAt),
    plans: planRows,
    logs: logRows.map((l) => ({ ...l, logDate: toDateKey(l.logDate) })),
  });
}
