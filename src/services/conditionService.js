import { prisma } from "./prismaClient.js";
import { mergeRules, rulesForCondition } from "../domain/conditionRules.js";

export function loadConditions(userId) {
  return prisma.healthCondition.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

// Bộ luật lọc món áp dụng cho TOÀN BỘ bệnh nền/dị ứng đã khai của user.
export async function loadUserRules(userId) {
  const conditions = await loadConditions(userId);
  return mergeRules(conditions.map((c) => rulesForCondition(c.name)));
}
