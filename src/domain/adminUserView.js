import { toDateKey, dateRange } from "./dateKey.js";
import { calcBMI } from "./bmiLogic.js";
import { computeAdherence, plannedDayKcal, isDayCompleted } from "./adherence.js";
import { ADHERENCE_CONFIG, EXERCISES, FREE_LIMITS } from "./constants.js";

/**
 * Domain thuần tuý cho trang admin xem thông tin người dùng.
 * Không phụ thuộc vào Express, Prisma hay DB.
 */

export function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1 || email.indexOf("@", atIndex + 1) !== -1) {
    return "***";
  }
  const namePart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  if (!domainPart || !domainPart.includes(".")) {
    return "***";
  }
  if (namePart.length === 1) {
    return `*@${domainPart}`;
  }
  return `${namePart[0]}***@${domainPart}`;
}

export function ageFromDob(dob, now = new Date()) {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (isNaN(d.getTime())) return null;
  const nowDate = now instanceof Date ? now : new Date(now);
  let age = nowDate.getUTCFullYear() - d.getUTCFullYear();
  const m = nowDate.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && nowDate.getUTCDate() < d.getUTCDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function lastActiveDate(mealDate, exerciseDate) {
  const m = mealDate ? toDateKey(mealDate) : null;
  const e = exerciseDate ? toDateKey(exerciseDate) : null;
  if (!m && !e) return null;
  if (m && !e) return m;
  if (!m && e) return e;
  return m > e ? m : e;
}

export function weightChange(bmiRecords, days) {
  if (!bmiRecords || bmiRecords.length < 2) return null;

  const sorted = [...bmiRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];

  if (days == null) {
    const first = sorted[0];
    const diff = latest.weightKg - first.weightKg;
    return Math.round(diff * 10) / 10;
  }

  const latestTime = new Date(latest.date).getTime();
  const thresholdTime = latestTime - days * 86400000;

  // Bản ghi gần nhất có ngày không muộn hơn (ngày mới nhất trừ N ngày)
  let candidate = null;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const t = new Date(sorted[i].date).getTime();
    if (t <= thresholdTime) {
      candidate = sorted[i];
      break;
    }
  }

  if (!candidate) return null;

  const diff = latest.weightKg - candidate.weightKg;
  return Math.round(diff * 10) / 10;
}

export function goalProgressPercent({ goalId, startKg, currentKg, targetKg }) {
  if (startKg == null || currentKg == null || targetKg == null) return null;
  if (goalId !== "giam_can" && goalId !== "tang_can") return null;

  let denominator = 0;
  let numerator = 0;

  if (goalId === "giam_can") {
    denominator = startKg - targetKg;
    numerator = startKg - currentKg;
  } else if (goalId === "tang_can") {
    denominator = targetKg - startKg;
    numerator = currentKg - startKg;
  }

  if (denominator === 0) return null;

  const pct = (numerator / denominator) * 100;
  const clamped = Math.min(100, Math.max(0, pct));
  return Math.round(clamped);
}

export function buildProfileSection(user, lastActive, now = new Date()) {
  if (!user) return null;
  return {
    fullName: user.fullName || "",
    email: user.email || "",
    gender: user.gender || null,
    age: ageFromDob(user.dob, now),
    isPremium: Boolean(user.isPremium),
    createdAt: toDateKey(user.createdAt),
    lastActiveDate: lastActive || null,
  };
}

export function buildBodySection(bmiRecords) {
  if (!bmiRecords || bmiRecords.length === 0) {
    return {
      heightCm: null,
      weightKg: null,
      bmi: null,
      startWeightKg: null,
      change: { total: null, days7: null, days30: null },
      recordCount: 0,
      recent: [],
    };
  }

  const sorted = [...bmiRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const heightCm = latest.heightCm != null ? Math.round(latest.heightCm * 10) / 10 : null;
  const weightKg = latest.weightKg != null ? Math.round(latest.weightKg * 10) / 10 : null;
  const bmi = latest.heightCm && latest.weightKg ? Math.round(calcBMI(latest.heightCm, latest.weightKg) * 10) / 10 : null;
  const startWeightKg = first.weightKg != null ? Math.round(first.weightKg * 10) / 10 : null;

  const change = {
    total: weightChange(sorted),
    days7: weightChange(sorted, 7),
    days30: weightChange(sorted, 30),
  };

  const recentSorted = [...bmiRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  const recent = recentSorted.map((r) => ({
    date: toDateKey(r.date),
    weightKg: Math.round(r.weightKg * 10) / 10,
  }));

  return {
    heightCm,
    weightKg,
    bmi,
    startWeightKg,
    change,
    recordCount: bmiRecords.length,
    recent,
  };
}

export function buildTargetSection(target, bmiRecords) {
  if (!target) return null;

  const sorted = bmiRecords && bmiRecords.length > 0
    ? [...bmiRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const startKg = first ? first.weightKg : null;
  const currentKg = latest ? latest.weightKg : null;

  const progressPercent = goalProgressPercent({
    goalId: target.goalId,
    startKg,
    currentKg,
    targetKg: target.targetWeightKg,
  });

  return {
    goalId: target.goalId,
    activityId: target.activityId,
    calories: Math.round(target.calories),
    protein: Math.round(target.protein),
    carb: Math.round(target.carb),
    fat: Math.round(target.fat),
    fiber: Math.round(target.fiber),
    bmr: Math.round(target.bmr),
    tdee: Math.round(target.tdee),
    targetWeightKg: target.targetWeightKg != null ? Math.round(target.targetWeightKg * 10) / 10 : null,
    durationMonths: target.durationMonths ?? null,
    dailyKcalDelta: target.dailyKcalDelta ?? null,
    effectiveFrom: toDateKey(target.effectiveFrom || target.createdAt),
    lastFeedbackCheckAt: target.lastFeedbackCheckAt ? toDateKey(target.lastFeedbackCheckAt) : null,
    progressPercent,
  };
}

export function buildConditionSection(conditions) {
  const result = {
    BENH_NEN: 0,
    DI_UNG: 0,
    CHI_DINH_BAC_SI: 0,
  };
  if (!conditions || !Array.isArray(conditions)) return result;
  for (const c of conditions) {
    if (Object.hasOwn(result, c.type)) {
      result[c.type]++;
    }
  }
  return result;
}

export function buildPlanSection(plans, now = new Date()) {
  const list = plans || [];
  const activePlan = list.find((p) => p.isActive);
  if (!activePlan) {
    return {
      source: null,
      createdAt: null,
      cycleDays: null,
      caloriesAtCreation: null,
      daysInUse: null,
      totalPlans: list.length,
    };
  }

  const nowDateKey = toDateKey(now);
  const planDateKey = toDateKey(activePlan.createdAt);
  const daysInUse = Math.max(
    0,
    Math.round((new Date(`${nowDateKey}T00:00:00Z`).getTime() - new Date(`${planDateKey}T00:00:00Z`).getTime()) / 86400000)
  );

  return {
    source: activePlan.source,
    createdAt: planDateKey,
    cycleDays: Array.isArray(activePlan.days) ? activePlan.days.length : 0,
    caloriesAtCreation: Math.round(activePlan.caloriesAtCreation),
    daysInUse,
    totalPlans: list.length,
  };
}

export function buildMealSection({ plans = [], logs = [], from, to, ratio = ADHERENCE_CONFIG.dayCompletionKcalRatio }) {
  const adherence = computeAdherence({ plans, logs, from, to, ratio });
  const planById = new Map(plans.map((p) => [p.id, p]));

  const logsByDate = new Map();
  for (const log of logs) {
    const d = typeof log.logDate === "string" ? log.logDate : toDateKey(log.logDate);
    const current = logsByDate.get(d) || [];
    current.push(log);
    logsByDate.set(d, current);
  }

  const days = dateRange(from, to).map((date) => {
    const dayLogs = logsByDate.get(date) || [];
    const intakeKcal = Math.round(dayLogs.reduce((sum, l) => sum + (Number.isFinite(l.kcal) ? l.kcal : 0), 0));

    let plannedKcal = 0;
    if (dayLogs.length > 0) {
      for (const l of dayLogs) {
        const p = planById.get(l.planId);
        if (p) plannedKcal = Math.max(plannedKcal, plannedDayKcal(p, l.dayIndex));
      }
    } else {
      const activeP = plans.find((p) => {
        const start = toDateKey(p.createdAt);
        const end = p.endedAt ? toDateKey(p.endedAt) : to;
        return start <= date && date <= end;
      });
      if (activeP && Array.isArray(activeP.days) && activeP.days.length > 0) {
        const diff = Math.round(
          (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${toDateKey(activeP.createdAt)}T00:00:00Z`).getTime()) /
            86400000
        );
        const idx = ((diff % activeP.days.length) + activeP.days.length) % activeP.days.length;
        plannedKcal = plannedDayKcal(activeP, activeP.days[idx]?.dayIndex ?? idx + 1);
      }
    }

    plannedKcal = Math.round(plannedKcal);
    const completed = isDayCompleted(intakeKcal, plannedKcal, ratio);

    return {
      date,
      intakeKcal,
      plannedKcal,
      completed,
    };
  });

  const loggedDays = days.filter((d) => d.intakeKcal > 0).length;
  const totalIntake = days.reduce((sum, d) => sum + (d.intakeKcal > 0 ? d.intakeKcal : 0), 0);
  const avgIntakeKcal = loggedDays > 0 ? Math.round(totalIntake / loggedDays) : null;

  const expectedDays = adherence.expectedUserDays;
  const completedDays = adherence.completedUserDays;
  const completionPercent = expectedDays > 0 ? Math.round((completedDays / expectedDays) * 100) : null;

  return {
    days,
    completedDays,
    expectedDays,
    completionPercent,
    loggedDays,
    avgIntakeKcal,
  };
}

export function buildExerciseSection(logs = []) {
  if (!logs || logs.length === 0) {
    return {
      activeDays: 0,
      totalMinutes: 0,
      totalKcal: 0,
      avgKcalPerActiveDay: null,
      topExercises: [],
    };
  }

  const dates = new Set();
  let totalMinutes = 0;
  let totalKcal = 0;
  const countsByExercise = new Map();

  for (const log of logs) {
    dates.add(typeof log.logDate === "string" ? log.logDate : toDateKey(log.logDate));
    totalMinutes += log.minutes || 0;
    totalKcal += log.kcal || 0;
    countsByExercise.set(log.exerciseId, (countsByExercise.get(log.exerciseId) || 0) + 1);
  }

  const activeDays = dates.size;
  const avgKcalPerActiveDay = activeDays > 0 ? Math.round(totalKcal / activeDays) : null;

  const topExercises = Array.from(countsByExercise.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([exerciseId, count]) => {
      const ex = EXERCISES.find((e) => e.id === exerciseId);
      return {
        exerciseId,
        label: ex?.label || exerciseId,
        count,
      };
    });

  return {
    activeDays,
    totalMinutes: Math.round(totalMinutes),
    totalKcal: Math.round(totalKcal),
    avgKcalPerActiveDay,
    topExercises,
  };
}

export function buildUsageSection(user) {
  if (!user) return null;
  const isPremium = Boolean(user.isPremium);
  return {
    scan: {
      used: user.scanCount ?? 0,
      limit: isPremium ? null : FREE_LIMITS.scan,
    },
    aiPlan: {
      used: user.aiPlanCount ?? 0,
      limit: isPremium ? null : FREE_LIMITS.aiPlan,
    },
  };
}

export function toUserListItem({ user, target, latestBmi, lastActiveDate: lastActive }) {
  return {
    id: user.id,
    fullName: user.fullName || "",
    emailMasked: maskEmail(user.email),
    isPremium: Boolean(user.isPremium),
    goalId: target?.goalId ?? null,
    targetKcal: target?.calories != null ? Math.round(target.calories) : null,
    weightKg: latestBmi?.weightKg != null ? Math.round(latestBmi.weightKg * 10) / 10 : null,
    lastActiveDate: lastActive ?? null,
    createdAt: toDateKey(user.createdAt),
  };
}

export function toUserDetail({
  profile,
  body,
  target,
  conditions,
  plan,
  meals,
  exercise,
  usage,
}) {
  return {
    profile,
    body,
    target,
    conditions,
    plan,
    meals,
    exercise,
    usage,
  };
}
