import { loadDishPool, loadGroupNames, toDishSummary, toCatalogEntries } from "./dishCatalog.js";
import { loadConditions } from "./conditionService.js";
import { incrementScanCount } from "./usageService.js";
import { recognizeDishes } from "./aiGateway.js";
import { findConflictingConditions } from "../domain/conditionRules.js";

// AI chỉ NHẬN DIỆN. Kcal/macro và cảnh báo xung đột bệnh nền luôn tính lại ở
// server từ catalog đã xác minh; dish_id lạ hoặc trùng bị loại bỏ.
export async function analyzeDishPhoto(user, { imageBase64, mealSlot, userNote }) {
  const [pool, groupNames, conditions] = await Promise.all([loadDishPool(), loadGroupNames(), loadConditions(user.id)]);

  const ai = await recognizeDishes(imageBase64, { mealSlot, userNote }, toCatalogEntries(pool, groupNames));
  await incrementScanCount(user.id);

  const poolById = new Map(pool.map((d) => [d.id, d]));
  const seen = new Set();
  const items = [];
  for (const it of Array.isArray(ai.items) ? ai.items : []) {
    const dish = poolById.get(Number(it?.dish_id));
    if (!dish || seen.has(dish.id)) continue;
    seen.add(dish.id);
    items.push({
      ...toDishSummary(dish, groupNames.get(dish.groupId)),
      confidence: it.confidence ?? null,
      conflicts: findConflictingConditions(dish, conditions),
    });
  }
  return { status: ai.status, items };
}
