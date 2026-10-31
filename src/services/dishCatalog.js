import { prisma } from "./prismaClient.js";
import { allowedSlotsFor } from "../domain/mealContext.js";
import { refineDishFormat } from "../domain/mealScenarios.js";

// Dạng "phẳng" của 1 món dùng cho thuật toán, bộ lọc bệnh nền và AI.
export function toPoolDish(row) {
  const {
    refinedFormat,
    proteinSource,
    isHeavySoup,
    isDeepFried,
    isHighSugar,
    isOrganMeat,
    isSnackOrBarFood,
    isHighSugarFruit,
    isNightHeavyCarb,
    isFastFood,
    isHealthy,
  } = refineDishFormat(row);
  const effectiveFormat = refinedFormat || row.dishFormat;
  return {
    id: row.id,
    nameVi: row.nameVi,
    nameEn: row.nameEn,
    groupId: row.groupId,
    kcal: row.kcal,
    protein_g: row.proteinG,
    fat_g: row.fatG,
    carb_g: row.carbG,
    sodium_mg: row.sodiumMg,
    cholesterol_mg: row.cholesterolMg,
    potassium_mg: row.potassiumMg,
    tags: row.tags,
    rawFormat: row.dishFormat,
    dishFormat: effectiveFormat,
    proteinSource,
    isHeavySoup,
    isDeepFried,
    isHighSugar,
    isOrganMeat,
    isSnackOrBarFood,
    isHighSugarFruit,
    isNightHeavyCarb,
    isFastFood,
    isHealthy: Boolean(isHealthy),
    serving_g: row.servingG || row.serving_g || 150,
    allowedSlots: allowedSlotsFor(effectiveFormat), // ["sang","trua",...] - xem domain/mealContext.js
  };
}

export async function loadDishPool() {
  const rows = await prisma.dish.findMany();
  return rows.map(toPoolDish);
}

export async function loadGroupNames() {
  const groups = await prisma.dishGroup.findMany();
  return new Map(groups.map((g) => [g.id, g.nameVi]));
}

// Thông tin cơ bản của 1 món — dùng chung cho danh sách tra cứu và kết quả quét.
export function toDishSummary(dish, groupNameVi) {
  return {
    id: dish.id,
    nameVi: dish.nameVi,
    nameEn: dish.nameEn,
    groupNameVi,
    kcal: dish.kcal,
    protein_g: dish.protein_g,
    fat_g: dish.fat_g,
    carb_g: dish.carb_g,
  };
}

// Catalog rút gọn đưa cho AI: KHÔNG kèm macro (AI không phải nguồn số liệu).
export function toCatalogEntries(dishes, groupNames) {
  return dishes.map((d) => ({ id: d.id, name: d.nameVi, group: groupNames.get(d.groupId) ?? "Khác", kcal: d.kcal }));
}
