import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { shiftDateKey, toDateKey } from "../domain/dateKey.js";
import { ADMIN_USER_CONFIG } from "../domain/constants.js";
import {
  lastActiveDate,
  buildProfileSection,
  buildBodySection,
  buildTargetSection,
  buildConditionSection,
  buildPlanSection,
  buildMealSection,
  buildExerciseSection,
  buildUsageSection,
  toUserListItem,
  toUserDetail,
} from "../domain/adminUserView.js";

export function logAdminAccess(adminEmail, userId, timestamp = new Date().toISOString()) {
  console.log(`[ADMIN_AUDIT] admin=${adminEmail} userId=${userId} timestamp=${timestamp}`);
}

export async function listUsers({ page, pageSize, skip, search, premium }) {
  const where = {
    ...(premium !== undefined ? { isPremium: premium } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        fullName: true,
        isPremium: true,
        createdAt: true,
        nutritionTargets: {
          where: { isActive: true },
          take: 1,
          select: { goalId: true, calories: true },
        },
        bmiRecords: {
          orderBy: { date: "desc" },
          take: 1,
          select: { weightKg: true },
        },
        mealLogs: {
          orderBy: { logDate: "desc" },
          take: 1,
          select: { logDate: true },
        },
        exerciseLogs: {
          orderBy: { logDate: "desc" },
          take: 1,
          select: { logDate: true },
        },
      },
    }),
  ]);

  const items = users.map((u) => {
    const target = u.nutritionTargets?.[0] || null;
    const latestBmi = u.bmiRecords?.[0] || null;
    const lastActive = lastActiveDate(u.mealLogs?.[0]?.logDate, u.exerciseLogs?.[0]?.logDate);
    return toUserListItem({
      user: u,
      target,
      latestBmi,
      lastActiveDate: lastActive,
    });
  });

  return {
    page,
    pageSize,
    total,
    items,
  };
}

export async function getUserDetail(userId, adminEmail) {
  // Ghi log truy cập admin (Bước 4)
  logAdminAccess(adminEmail, userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      gender: true,
      dob: true,
      isPremium: true,
      scanCount: true,
      aiPlanCount: true,
      createdAt: true,
    },
  });

  if (!user) throw new HttpError(404, "Không tìm thấy người dùng.");

  const now = new Date();
  const to = toDateKey(now);
  const from = shiftDateKey(to, -(ADMIN_USER_CONFIG.statsDays - 1));
  const fromDate = new Date(`${from}T00:00:00.000Z`);

  const [bmiRecords, target, conditions, plans, latestMeal, latestExercise, mealLogs, exerciseLogs] =
    await Promise.all([
      prisma.bmiRecord.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: { id: true, date: true, heightCm: true, weightKg: true },
      }),
      prisma.nutritionTarget.findFirst({
        where: { userId, isActive: true },
      }),
      prisma.healthCondition.findMany({
        where: { userId },
        select: { id: true, type: true, name: true },
      }),
      prisma.mealPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          source: true,
          createdAt: true,
          endedAt: true,
          days: true,
          caloriesAtCreation: true,
          isActive: true,
        },
      }),
      prisma.mealLog.findFirst({
        where: { userId },
        orderBy: { logDate: "desc" },
        select: { logDate: true },
      }),
      prisma.exerciseLog.findFirst({
        where: { userId },
        orderBy: { logDate: "desc" },
        select: { logDate: true },
      }),
      prisma.mealLog.findMany({
        where: { userId, logDate: { gte: fromDate } },
        select: { userId: true, planId: true, logDate: true, dayIndex: true, kcal: true },
      }),
      prisma.exerciseLog.findMany({
        where: { userId, logDate: { gte: fromDate } },
        select: { logDate: true, exerciseId: true, minutes: true, kcal: true },
      }),
    ]);

  const lastActive = lastActiveDate(latestMeal?.logDate, latestExercise?.logDate);
  const profile = buildProfileSection(user, lastActive, now);
  const body = buildBodySection(bmiRecords);
  const targetSection = buildTargetSection(target, bmiRecords);
  const conditionSection = buildConditionSection(conditions);
  const planSection = buildPlanSection(plans, now);
  const mealSection = buildMealSection({
    plans,
    logs: mealLogs.map((l) => ({ ...l, logDate: toDateKey(l.logDate) })),
    from,
    to,
  });
  const exerciseSection = buildExerciseSection(
    exerciseLogs.map((l) => ({ ...l, logDate: toDateKey(l.logDate) }))
  );
  const usageSection = buildUsageSection(user);

  return toUserDetail({
    profile,
    body,
    target: targetSection,
    conditions: conditionSection,
    plan: planSection,
    meals: mealSection,
    exercise: exerciseSection,
    usage: usageSection,
  });
}
