import { prisma } from "./prismaClient.js";

// Chỉ gọi sau khi đã thực sự gọi AI (không tăng khi dùng thuật toán nội bộ) —
// đúng nguyên tắc "aiPlanCount chỉ đếm AI API call thật sự".
export function incrementAiPlanCount(userId) {
  return prisma.user.update({ where: { id: userId }, data: { aiPlanCount: { increment: 1 } } });
}

export function incrementScanCount(userId) {
  return prisma.user.update({ where: { id: userId }, data: { scanCount: { increment: 1 } } });
}
