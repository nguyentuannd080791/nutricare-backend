import { toDateKey, shiftDateKey, dateRange } from "./dateKey.js";
import { computeAdherence } from "./adherence.js";

const countByDay = (dates) => {
  const map = new Map();
  for (const d of dates) {
    const key = toDateKey(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

/**
 * Gộp các dòng dữ liệu thô (service đã truy vấn) thành số liệu dashboard.
 * Thuần tuý — không đụng DB — nên test được độc lập.
 */
export function buildAdminStats({ now, days, ratio, totals, newUserDates, newPlanDates, plans, logs }) {
  const to = toDateKey(now);
  const from = shiftDateKey(to, -(days - 1));
  const adherence = computeAdherence({ plans, logs, from, to, ratio });
  const usersByDay = countByDay(newUserDates);
  const plansByDay = countByDay(newPlanDates);
  const adherenceByDay = new Map(adherence.series.map((d) => [d.date, d]));

  const series = dateRange(from, to).map((date) => ({
    date,
    newUsers: usersByDay.get(date) ?? 0,
    plansCreated: plansByDay.get(date) ?? 0,
    ...adherenceByDay.get(date),
  }));

  return {
    range: { from, to, days },
    totals,
    window: {
      newUsers: newUserDates.length,
      plansCreated: newPlanDates.length,
      completionRate: adherence.completionRate,
      completedUserDays: adherence.completedUserDays,
      expectedUserDays: adherence.expectedUserDays,
    },
    definition: { dayCompletionKcalRatio: ratio },
    series,
  };
}
