import { FEEDBACK_LOOP_CONFIG } from "./constants.js";

// Hướng cân nặng KỲ VỌNG theo từng mục tiêu — dùng để so khớp với chiều
// thay đổi cân nặng thực tế. giu_dang không có hướng kỳ vọng rõ ràng nên
// Feedback Loop không áp dụng cho mục tiêu này (trigger luôn false).
const EXPECTED_DIRECTION = { giam_can: -1, tang_can: 1, tang_co: 1, giu_dang: 0 };

function averageWeight(records) {
  if (!records.length) return null;
  return records.reduce((s, r) => s + r.weightKg, 0) / records.length;
}

// Lọc các bản ghi BMI rơi vào cửa sổ [end - days + 1, end], theo NGÀY
// (không theo giờ), để một bản ghi "hôm nay" luôn được tính dù giờ ghi
// khác giờ hiện tại.
function recordsInWindow(bmiRecords, endDateIso, days) {
  const end = new Date(endDateIso);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return bmiRecords.filter((r) => {
    const d = new Date(r.date);
    return d >= start && d <= end;
  });
}

// So sánh trung bình cân nặng 7 ngày gần nhất với 7 ngày liền trước đó —
// làm mượt nhiễu cân nặng ngày-qua-ngày đúng tinh thần "Vòng lặp điều
// chỉnh theo xu hướng" trong tài liệu. Trả về { evaluable: false } khi
// chưa đủ dữ liệu ở MỘT trong hai cửa sổ (cần tối thiểu 14 ngày dữ liệu).
export function evaluateWeightTrend({ bmiRecords, goalId, asOfDate = new Date().toISOString() }) {
  const expectedDirection = EXPECTED_DIRECTION[goalId] ?? 0;
  if (expectedDirection === 0) return { evaluable: false, reason: "goal_has_no_direction" };

  const thisWeek = recordsInWindow(bmiRecords, asOfDate, 7);
  const prevWeekEnd = new Date(asOfDate);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const lastWeek = recordsInWindow(bmiRecords, prevWeekEnd.toISOString(), 7);

  const avgThisWeek = averageWeight(thisWeek);
  const avgLastWeek = averageWeight(lastWeek);
  if (avgThisWeek == null || avgLastWeek == null) return { evaluable: false, reason: "not_enough_data" };

  const deltaKg = avgThisWeek - avgLastWeek;
  const isStagnant = Math.abs(deltaKg) < FEEDBACK_LOOP_CONFIG.stagnationKg;
  const isWrongDirection = Math.sign(deltaKg) !== 0 && Math.sign(deltaKg) !== expectedDirection;
  const offTrack = isStagnant || isWrongDirection;

  return { evaluable: true, avgThisWeek, avgLastWeek, deltaKg, expectedDirection, offTrack };
}

// ± calorieStepKcal (mặc định 125, giữa khoảng 100-150 tài liệu quy định):
// dấu điều chỉnh LUÔN cùng chiều với expectedDirection — mục tiêu giảm cân
// bị chững/tăng ngược -> trừ thêm calo; mục tiêu tăng cân bị chững/giảm
// ngược -> cộng thêm calo. Trả về 0 khi không đủ dữ liệu hoặc không lệch
// hướng (không cần điều chỉnh).
export function computeCalorieAdjustment(trend) {
  if (!trend.evaluable || !trend.offTrack) return 0;
  return trend.expectedDirection * FEEDBACK_LOOP_CONFIG.calorieStepKcal;
}

// Cổng tần suất: chỉ cho phép chạy lại Feedback Loop sau khi đã đủ
// `days` ngày kể từ lần kiểm tra gần nhất (mặc định 7 — đúng chu kỳ
// "tuần kế tiếp" trong tài liệu), tránh điều chỉnh dồn dập mỗi lần người
// dùng chỉ ghi thêm 1 chỉ số cân nặng.
export function isFeedbackCheckDue(lastCheckedAt, asOfDate = new Date().toISOString(), days = 7) {
  if (!lastCheckedAt) return true;
  const elapsedMs = new Date(asOfDate).getTime() - new Date(lastCheckedAt).getTime();
  return elapsedMs >= days * 24 * 60 * 60 * 1000;
}

export function diagnoseFeedbackLoop({ bmiRecords = [], target = null, isPremium = false, now = new Date() }) {
  const nowIso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const nowDate = new Date(nowIso);

  if (!isPremium) {
    return {
      status: "not_premium",
      isPremium: false,
      isDue: false,
      daysUntilNextCheck: null,
      thisWeekCount: 0,
      lastWeekCount: 0,
      calorieAdjustment: 0,
      message: "Vòng lặp tự động nắn calo theo xu hướng cân nặng 14 ngày dành riêng cho gói Premium.",
    };
  }

  if (!target) {
    return {
      status: "no_target",
      isPremium: true,
      isDue: false,
      daysUntilNextCheck: null,
      thisWeekCount: 0,
      lastWeekCount: 0,
      calorieAdjustment: 0,
      message: "Chưa thiết lập mục tiêu dinh dưỡng.",
    };
  }

  if (target.goalId === "giu_dang") {
    return {
      status: "goal_not_applicable",
      isPremium: true,
      isDue: false,
      daysUntilNextCheck: null,
      thisWeekCount: 0,
      lastWeekCount: 0,
      calorieAdjustment: 0,
      message: "Mục tiêu duy trì cân nặng (Giữ dáng) không áp dụng vòng lặp tăng/giảm calo tự động.",
    };
  }

  const thisWeek = recordsInWindow(bmiRecords, nowIso, 7);
  const prevWeekEnd = new Date(nowIso);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const lastWeek = recordsInWindow(bmiRecords, prevWeekEnd.toISOString(), 7);

  const thisWeekCount = thisWeek.length;
  const lastWeekCount = lastWeek.length;

  const isDue = isFeedbackCheckDue(target.lastFeedbackCheckAt, nowIso, 7);
  let daysUntilNextCheck = 0;
  if (target.lastFeedbackCheckAt) {
    const elapsedMs = nowDate.getTime() - new Date(target.lastFeedbackCheckAt).getTime();
    daysUntilNextCheck = Math.max(0, Math.ceil((7 * 86400000 - elapsedMs) / 86400000));
  }

  const trend = evaluateWeightTrend({ bmiRecords, goalId: target.goalId, asOfDate: nowIso });

  if (!trend.evaluable) {
    return {
      status: "insufficient_data",
      isPremium: true,
      isDue,
      daysUntilNextCheck,
      thisWeekCount,
      lastWeekCount,
      calorieAdjustment: 0,
      message: `Cần ghi nhận cân nặng ở cả 2 tuần (tuần này: ${thisWeekCount}/7 ngày, tuần trước: ${lastWeekCount}/7 ngày) để đánh giá xu hướng.`,
    };
  }

  const calorieAdjustment = computeCalorieAdjustment(trend);

  if (!isDue) {
    return {
      status: "in_cooldown",
      isPremium: true,
      isDue: false,
      daysUntilNextCheck,
      thisWeekCount,
      lastWeekCount,
      calorieAdjustment: 0,
      trend: {
        avgThisWeek: Math.round(trend.avgThisWeek * 10) / 10,
        avgLastWeek: Math.round(trend.avgLastWeek * 10) / 10,
        deltaKg: Math.round(trend.deltaKg * 10) / 10,
      },
      message: `Đang trong chu kỳ theo dõi 7 ngày. Lần đánh giá tiếp theo sau ${daysUntilNextCheck} ngày.`,
    };
  }

  if (trend.offTrack) {
    const directionText = trend.deltaKg > 0 ? "tăng" : trend.deltaKg < 0 ? "giảm" : "chững";
    return {
      status: "adjusted",
      isPremium: true,
      isDue: true,
      daysUntilNextCheck: 7,
      thisWeekCount,
      lastWeekCount,
      calorieAdjustment,
      trend: {
        avgThisWeek: Math.round(trend.avgThisWeek * 10) / 10,
        avgLastWeek: Math.round(trend.avgLastWeek * 10) / 10,
        deltaKg: Math.round(trend.deltaKg * 10) / 10,
      },
      message: `Cân nặng ${directionText} (${Math.abs(trend.deltaKg).toFixed(1)}kg so với tuần trước) chưa khớp mục tiêu. Đã tự động điều chỉnh ${calorieAdjustment > 0 ? "+" : ""}${calorieAdjustment} kcal.`,
    };
  }

  return {
    status: "on_track",
    isPremium: true,
    isDue: true,
    daysUntilNextCheck: 7,
    thisWeekCount,
    lastWeekCount,
    calorieAdjustment: 0,
    trend: {
      avgThisWeek: Math.round(trend.avgThisWeek * 10) / 10,
      avgLastWeek: Math.round(trend.avgLastWeek * 10) / 10,
      deltaKg: Math.round(trend.deltaKg * 10) / 10,
    },
    message: `Cân nặng đang biến động đúng tiến độ mục tiêu (${trend.deltaKg >= 0 ? "+" : ""}${trend.deltaKg.toFixed(1)}kg). Giữ nguyên mức calo hiện tại.`,
  };
}
