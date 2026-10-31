import { prisma } from "./prismaClient.js";
import { HttpError } from "../errors.js";
import { findExercise, calcBurnedKcal } from "../domain/exerciseCalories.js";
import { sumKcal } from "../domain/dailyBalance.js";
import { toDateKey } from "../domain/dateKey.js";

function todayKey() {
  return toDateKey(new Date());
}

function toDbDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toView(log) {
  return {
    id: log.id,
    date: toDateKey(log.logDate),
    exerciseId: log.exerciseId,
    minutes: log.minutes,
    kcal: log.kcal,
  };
}

export async function addExerciseLog(user, { exerciseId, minutes, date }) {
  const exercise = findExercise(exerciseId);
  if (!exercise) throw new HttpError(400, "Bài tập không có trong danh mục.");

  const bmi = await prisma.bmiRecord.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } });
  if (!bmi) throw new HttpError(400, "Cần nhập cân nặng trước khi ghi bài tập.");

  const kcal = calcBurnedKcal({ met: exercise.met, weightKg: bmi.weightKg, minutes });
  const logDateKey = date || todayKey();
  const targetDate = toDbDate(logDateKey);

  // Idempotency: Kiểm tra nếu đã có bài tập này trong ngày thì cập nhật thay vì tạo trùng lặp
  const existing = await prisma.exerciseLog.findMany({
    where: { userId: user.id, logDate: targetDate, exerciseId },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length > 0) {
    const [primary, ...duplicates] = existing;
    if (duplicates.length > 0) {
      await prisma.exerciseLog.deleteMany({
        where: { id: { in: duplicates.map((d) => d.id) } },
      });
    }
    const updated = await prisma.exerciseLog.update({
      where: { id: primary.id },
      data: { minutes, weightKg: bmi.weightKg, kcal },
    });
    return toView(updated);
  }

  const log = await prisma.exerciseLog.create({
    data: { userId: user.id, logDate: targetDate, exerciseId, minutes, weightKg: bmi.weightKg, kcal },
  });
  return toView(log);
}

export async function listExerciseLogs(userId, date) {
  const rows = await prisma.exerciseLog.findMany({
    where: { userId, logDate: toDbDate(date) },
    orderBy: { createdAt: "asc" },
  });

  // Tự động deduplicate và dọn sạch database nếu trước đó đã tích lũy bản ghi trùng lặp
  const seenExercise = new Set();
  const duplicateIds = [];
  const uniqueRows = [];

  for (const row of rows) {
    if (seenExercise.has(row.exerciseId)) {
      duplicateIds.push(row.id);
    } else {
      seenExercise.add(row.exerciseId);
      uniqueRows.push(row);
    }
  }

  if (duplicateIds.length > 0) {
    prisma.exerciseLog
      .deleteMany({ where: { id: { in: duplicateIds } } })
      .catch(() => {});
  }

  const entries = uniqueRows.map(toView);
  return { date, entries, totalKcal: sumKcal(entries) };
}

export async function deleteExerciseLog(userId, idOrExerciseId, dateKey = null) {
  if (!idOrExerciseId || typeof idOrExerciseId !== "string" || idOrExerciseId.trim() === "" || idOrExerciseId === "undefined" || idOrExerciseId === "null") {
    return;
  }
  const cleanId = idOrExerciseId.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  if (isUuid) {
    // 1. Nếu là UUID cụ thể của 1 log, chỉ xóa chính xác bản ghi đó của user
    await prisma.exerciseLog.deleteMany({
      where: { id: cleanId, userId },
    });
    return;
  }

  // 2. Nếu là exerciseId (vd: 'brisk_walking', 'jogging'), chỉ xóa bản ghi trong ngày chỉ định (tránh xóa nhầm ngày khác)
  const targetDateKey = dateKey || todayKey();
  await prisma.exerciseLog.deleteMany({
    where: {
      userId,
      exerciseId: cleanId,
      logDate: toDbDate(targetDateKey),
    },
  });
}
