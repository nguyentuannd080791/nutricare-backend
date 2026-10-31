import { toDateKey, dateRange } from "./dateKey.js";
import { isRestDay } from "./restDay.js";

export function plannedDayKcal(plan, dayIndex) {
  const day = Array.isArray(plan.days) ? plan.days.find((d) => d.dayIndex === dayIndex) : null;
  return (day?.meals ?? []).reduce((sum, m) => sum + (Number.isFinite(m.kcal) ? m.kcal : 0), 0);
}

export const isDayCompleted = (loggedKcal, plannedKcal, ratio) => plannedKcal > 0 && loggedKcal >= plannedKcal * ratio;

/**
 * Hoàn thành theo NGÀY, tổng hợp mọi bữa của ngày đó.
 *  - expected  = người dùng có thực đơn hiệu lực ngày đó (mỗi người tính 1 lần/ngày); ngày nghỉ không tính
 *  - completed = expected và tổng calo đã ăn >= ratio × calo thực đơn ngày đó
 *  - logging   = có ghi ít nhất 1 bữa (kể cả chưa đủ ngưỡng)
 * plans: [{ id, userId, createdAt, endedAt, days }]
 * logs : [{ userId, planId, logDate: "YYYY-MM-DD", dayIndex, kcal }]
 */
export function computeAdherence({ plans, logs, from, to, ratio }) {
  const planById = new Map(plans.map((p) => [p.id, p]));
  const logsByDay = new Map(); // "date|userId" -> { kcal, planned }
  for (const log of logs) {
    const plan = planById.get(log.planId);
    const key = `${log.logDate}|${log.userId}`;
    const entry = logsByDay.get(key) ?? { kcal: 0, planned: 0 };
    entry.kcal += log.kcal;
    // Nếu cùng ngày có log của 2 thực đơn (đổi thực đơn giữa ngày) lấy ngưỡng cao hơn: không thổi phồng tỉ lệ.
    entry.planned = Math.max(entry.planned, plan ? plannedDayKcal(plan, log.dayIndex) : 0);
    logsByDay.set(key, entry);
  }

  const series = dateRange(from, to).map((date) => {
    const expected = new Set();
    if (!isRestDay(date)) {
      for (const p of plans) {
        const end = p.endedAt ? toDateKey(p.endedAt) : to;
        if (toDateKey(p.createdAt) <= date && date <= end) expected.add(p.userId);
      }
    }
    const logging = new Set();
    let completedUsers = 0;
    for (const [key, entry] of logsByDay) {
      const [logDate, userId] = key.split("|");
      if (logDate !== date) continue;
      logging.add(userId);
      if (expected.has(userId) && isDayCompleted(entry.kcal, entry.planned, ratio)) completedUsers += 1;
    }
    const expectedUsers = expected.size;
    return {
      date,
      expectedUsers,
      completedUsers,
      loggingUsers: logging.size,
      completionRate: expectedUsers ? completedUsers / expectedUsers : null,
    };
  });

  const expectedUserDays = series.reduce((s, d) => s + d.expectedUsers, 0);
  const completedUserDays = series.reduce((s, d) => s + d.completedUsers, 0);
  return { series, expectedUserDays, completedUserDays, completionRate: expectedUserDays ? completedUserDays / expectedUserDays : null };
}
