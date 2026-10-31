import { toDateKey, shiftDateKey } from "./dateKey.js";

// Máy khách và server có thể lệch múi giờ tối đa ~1 ngày so với quy ước UTC.
const TIMEZONE_TOLERANCE_DAYS = 1;

// Chỉ cho ghi "đã ăn" cho ngày nằm trong đời của thực đơn và không ở tương lai.
// Trả { ok, reason } thay vì ném lỗi để domain không phụ thuộc HTTP.
export function checkLoggableDate(dateKey, plan, now = new Date()) {
  const earliest = shiftDateKey(toDateKey(plan.createdAt), -TIMEZONE_TOLERANCE_DAYS);
  if (dateKey < earliest) return { ok: false, reason: "Ngày này trước khi thực đơn được tạo." };

  const latestByClock = shiftDateKey(toDateKey(now), TIMEZONE_TOLERANCE_DAYS);
  const latestByPlan = plan.endedAt ? shiftDateKey(toDateKey(plan.endedAt), TIMEZONE_TOLERANCE_DAYS) : latestByClock;
  const latest = latestByPlan < latestByClock ? latestByPlan : latestByClock;
  if (dateKey > latest) return { ok: false, reason: "Không thể ghi cho ngày chưa tới hoặc sau khi thực đơn đã kết thúc." };

  return { ok: true };
}

export function findPlannedMeal(plan, dayIndex, mealSlot) {
  const day = Array.isArray(plan.days) ? plan.days.find((d) => d.dayIndex === dayIndex) : null;
  return day?.meals?.find((m) => m.mealSlot === mealSlot) ?? null;
}

// Bản chụp món + calo LẤY TỪ THỰC ĐƠN (nguồn đáng tin), không từ client.
export function snapshotMeal(meal) {
  return {
    dishIds: Array.isArray(meal.dishIds) ? meal.dishIds : [],
    kcal: Number.isFinite(meal.kcal) ? meal.kcal : 0,
  };
}
