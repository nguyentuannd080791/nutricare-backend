import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { checkLoggableDate, findPlannedMeal, snapshotMeal } from "../domain/mealLogRules.js";
import { toDateKey } from "../domain/dateKey.js";

const toDbDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

// Ghi/bỏ "đã ăn" cho 1 bữa. Server tự đối chiếu: thực đơn phải của user, ngày
// phải nằm trong đời thực đơn, bữa phải có trong thực đơn — món và calo lấy từ
// thực đơn, KHÔNG nhận từ client. Idempotent: gửi lại cùng trạng thái không đổi gì.
export async function setMealLog(user, { planId, date, dayIndex, mealSlot, eaten }) {
  const plan = await prisma.mealPlan.findFirst({ where: { id: planId, userId: user.id } });
  if (!plan) throw new HttpError(404, "Không tìm thấy thực đơn.");

  const dateCheck = checkLoggableDate(date, plan);
  if (!dateCheck.ok) throw new HttpError(400, dateCheck.reason);

  const logDate = toDbDate(date);
  if (!eaten) {
    // Giới hạn theo planId để bỏ tick thực đơn cũ không xoá nhầm tick của thực đơn mới.
    await prisma.mealLog.deleteMany({ where: { userId: user.id, planId, logDate, mealSlot } });
    return { eaten: false };
  }

  const meal = findPlannedMeal(plan, dayIndex, mealSlot);
  if (!meal) throw new HttpError(400, "Bữa ăn này không có trong thực đơn.");
  const snapshot = snapshotMeal(meal);

  await prisma.mealLog.upsert({
    where: { userId_logDate_mealSlot: { userId: user.id, logDate, mealSlot } },
    create: { userId: user.id, planId, logDate, mealSlot, dayIndex, ...snapshot },
    update: { planId, dayIndex, ...snapshot },
  });
  return { eaten: true, kcal: snapshot.kcal };
}

export async function listMealLogs(userId, { from, to }) {
  const rows = await prisma.mealLog.findMany({
    where: { userId, logDate: { gte: toDbDate(from), lte: toDbDate(to) } },
    orderBy: [{ logDate: "asc" }, { mealSlot: "asc" }],
  });
  return rows.map((r) => ({ planId: r.planId, date: toDateKey(r.logDate), dayIndex: r.dayIndex, mealSlot: r.mealSlot, kcal: r.kcal }));
}
