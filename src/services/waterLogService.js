import { prisma } from "./prismaClient.js";
import { toDateKey } from "../domain/dateKey.js";
import { WATER_CUP_ML, WATER_GOAL_CUPS, WATER_MAX_CUPS } from "../domain/waterRules.js";

function toDbDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toView(date, cups) {
  return { date, cups, goalCups: WATER_GOAL_CUPS, maxCups: WATER_MAX_CUPS, cupMl: WATER_CUP_ML };
}

export async function getWaterLog(userId, date) {
  const row = await prisma.waterLog.findUnique({ where: { userId_logDate: { userId, logDate: toDbDate(date) } } });
  return toView(date, row ? row.cups : 0);
}

export async function setTodayWaterLog(userId, cups, now = new Date()) {
  const date = toDateKey(now);
  const logDate = toDbDate(date);
  await prisma.waterLog.upsert({
    where: { userId_logDate: { userId, logDate } },
    create: { userId, logDate, cups },
    update: { cups },
  });
  return toView(date, cups);
}
