import { MEAL_TYPES } from "./constants.js";
import { isDishAllowed } from "./conditionRules.js";
import { getScenariosForGoal, getFallbackScenario } from "./mealScenarios.js";

const SWAP_CANDIDATE_COUNT = 3;
const DEFAULT_TEMPLATE = { proteinRatio: 0.25, fatRatio: 0.25, carbRatio: 0.5 };

const PROTEIN_DEFICIT_MULT = 2.5;
const PROTEIN_SURPLUS_MULT = 0.4;
const MACRO_IMPORTANCE = { protein: 2, fat: 1, carb: 1 };

// Giới hạn tần suất trong tuần
const MAX_SHELLFISH_PER_WEEK = 3;
const MAX_FAST_FOOD_BREAKFAST_PER_WEEK = 1;

// Pool -> chỉ giữ món hợp với bộ luật bệnh nền/dị ứng (fail-closed)
export function filterEligibleDishes(pool, rules) {
  return pool.filter((d) => isDishAllowed(d, rules));
}

export function filterBySlot(dishes, mealSlotId) {
  return dishes.filter((d) => !d.allowedSlots || d.allowedSlots.includes(mealSlotId));
}

function proteinError(actualG, targetG, scaleG) {
  const diff = (actualG || 0) - targetG;
  const relErr = Math.abs(diff) / Math.max(scaleG, 1);
  return relErr * (diff < 0 ? PROTEIN_DEFICIT_MULT : PROTEIN_SURPLUS_MULT);
}

function symmetricRelError(actualG, targetG, scaleG) {
  return Math.abs((actualG || 0) - targetG) / Math.max(scaleG, 1);
}

// Kiểm tra món có đang bị cooldown (trùng ID hoặc trùng tên trong vòng 3 ngày qua)
function isDishInCooldown(dish, currentDay, dishLastUsedDay, nameLastUsedDay) {
  const lastUsedById = dishLastUsedDay.get(dish.id);
  const normName = (dish.nameVi || "").toLowerCase().trim();
  const lastUsedByName = nameLastUsedDay.get(normName);
  const lastUsed = Math.max(lastUsedById ?? -999, lastUsedByName ?? -999);
  return lastUsed !== -999 && currentDay - lastUsed <= 3;
}

// Chấm điểm riêng cho từng món con theo đúng VAI TRÒ (Role) trong kịch bản.
function scoreSlotDish(dish, slotRole, subBudget, mealScale) {
  const minScaleKcal = Math.max(mealScale.kcal * 0.25, 80);
  const minScaleP = Math.max(mealScale.protein_g * 0.25, 12);
  const minScaleF = Math.max(mealScale.fat_g * 0.25, 8);
  const minScaleC = Math.max(mealScale.carb_g * 0.25, 20);

  const kcalErr = Math.abs((dish.kcal || 0) - subBudget.kcal) / minScaleKcal;

  if (slotRole === "VEG") {
    const fatExcess = Math.max(0, (dish.fat_g || 0) - subBudget.fat_g) / minScaleF;
    return kcalErr * 0.7 + fatExcess * 0.3;
  }

  if (slotRole === "SOUP") {
    const fatExcess = Math.max(0, (dish.fat_g || 0) - subBudget.fat_g) / minScaleF;
    return kcalErr * 0.7 + fatExcess * 0.3;
  }

  if (slotRole === "STAPLE_CARB") {
    const carbDiff = Math.abs((dish.carb_g || 0) - subBudget.carb_g) / minScaleC;
    const fatExcess = Math.max(0, (dish.fat_g || 0) - subBudget.fat_g) / minScaleF;
    return kcalErr * 0.4 + carbDiff * 0.4 + fatExcess * 0.2;
  }

  if (slotRole === "DRINK" || slotRole === "SNACK") {
    const fatExcess = Math.max(0, (dish.fat_g || 0) - subBudget.fat_g) / minScaleF;
    return kcalErr * 0.6 + fatExcess * 0.4;
  }

  // Món đạm chính (MAIN_PROTEIN) & Món đạm phụ (SIDE_PROTEIN)
  const pDiff = (dish.protein_g || 0) - subBudget.protein_g;
  const pErr = (Math.abs(pDiff) / minScaleP) * (pDiff < 0 ? PROTEIN_DEFICIT_MULT : PROTEIN_SURPLUS_MULT);
  const fErr = Math.abs((dish.fat_g || 0) - subBudget.fat_g) / minScaleF;
  const cErr = Math.abs((dish.carb_g || 0) - subBudget.carb_g) / minScaleC;
  const macroErr = (pErr * 2 + fErr + cErr) / 4;

  let score = kcalErr * 0.45 + macroErr * 0.55;

  // Điểm thưởng lớn để ưu tiên thịt nạc trắng (gà, cá) và thịt nạc heo/bò, đậu hũ
  if (dish.proteinSource === "POULTRY" || dish.proteinSource === "FISH") {
    score -= 0.4; // Ưu tiên hàng đầu (tối thiểu 4-5 bữa/tuần)
  } else if (dish.proteinSource === "PORK_BEEF" || dish.proteinSource === "PLANT") {
    score -= 0.25;
  }

  return score;
}

// Chấm điểm tổng hợp cho toàn bộ mâm cơm
function scoreMealCombo(items, slotBudget, scale) {
  const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0);
  const totalP = items.reduce((s, i) => s + (i.protein_g || 0), 0);
  const totalF = items.reduce((s, i) => s + (i.fat_g || 0), 0);
  const totalC = items.reduce((s, i) => s + (i.carb_g || 0), 0);

  const kcalErr = Math.abs(totalKcal - slotBudget.kcal) / Math.max(scale.kcal, 1);
  const proteinErr = proteinError(totalP, slotBudget.protein_g, scale.protein_g);
  const fatErr = symmetricRelError(totalF, slotBudget.fat_g, scale.fat_g);
  const carbErr = symmetricRelError(totalC, slotBudget.carb_g, scale.carb_g);
  const macroErr =
    (proteinErr * MACRO_IMPORTANCE.protein + fatErr * MACRO_IMPORTANCE.fat + carbErr * MACRO_IMPORTANCE.carb) /
    (MACRO_IMPORTANCE.protein + MACRO_IMPORTANCE.fat + MACRO_IMPORTANCE.carb);

  return kcalErr * 0.55 + macroErr * 0.45;
}

export function dailyMacroTargets(targetCalories, template) {
  return {
    kcal: targetCalories,
    protein_g: (targetCalories * template.proteinRatio) / 4,
    fat_g: (targetCalories * template.fatRatio) / 9,
    carb_g: (targetCalories * template.carbRatio) / 4,
  };
}

export function slotShare(dailyTargets, pct) {
  return {
    kcal: dailyTargets.kcal * pct,
    protein_g: dailyTargets.protein_g * pct,
    fat_g: dailyTargets.fat_g * pct,
    carb_g: dailyTargets.carb_g * pct,
  };
}

export function staticSlotBudget(targetCalories, template, mealSlotId) {
  const pct = MEAL_TYPES.find((m) => m.id === mealSlotId)?.pct ?? 0;
  return slotShare(dailyMacroTargets(targetCalories, template), pct);
}

// Damped Error Accumulation & Clamping:
export function remainingSlotBudget(dailyTargets, cumulativePct, consumed, mealSlotId, template = DEFAULT_TEMPLATE) {
  const staticBudget = staticSlotBudget(dailyTargets.kcal, template, mealSlotId);
  const cumulative = slotShare(dailyTargets, cumulativePct);

  const rawKcal = cumulative.kcal - consumed.kcal;
  const rawProtein = cumulative.protein_g - consumed.protein_g;
  const rawFat = cumulative.fat_g - consumed.fat_g;
  const rawCarb = cumulative.carb_g - consumed.carb_g;

  // Hệ số giảm chấn (damping factor = 0.35) và kẹp trong khoảng [0.65, 1.35]
  const damp = (raw, stat) => {
    const delta = (raw - stat) * 0.35;
    const target = stat + delta;
    return Math.max(stat * 0.65, Math.min(stat * 1.35, target));
  };

  return {
    kcal: damp(rawKcal, staticBudget.kcal),
    protein_g: damp(rawProtein, staticBudget.protein_g),
    fat_g: damp(rawFat, staticBudget.fat_g),
    carb_g: damp(rawCarb, staticBudget.carb_g),
  };
}

// Xây dựng 1 mâm cơm cho 1 kịch bản cụ thể với dynamic tolerance bands
function generateMealForScenario(
  scenario,
  eligible,
  slotBudget,
  scale,
  dishLastUsedDay,
  nameLastUsedDay,
  currentDay,
  goalId,
  mealSlotId,
  stats
) {
  const slotCandidates = [];

  for (const slot of scenario.slots) {
    // 1. Lọc theo slot cho phép (allowedSlots) và format
    let pool = eligible
      .filter((d) => !d.allowedSlots || d.allowedSlots.includes(mealSlotId))
      .filter((d) => slot.formats.includes(d.dishFormat));

    // 2. Hard Cooldown: Cấm lặp lại món đã ăn trong vòng 2 ngày gần nhất (theo cả ID và TÊN MÓN chuẩn hóa)
    const activeCooldownDishes = pool.filter((d) => !isDishInCooldown(d, currentDay, dishLastUsedDay, nameLastUsedDay));
    if (activeCooldownDishes.length > 0) {
      pool = activeCooldownDishes;
    }

    // 3. Khống chế tần suất hải sản vỏ/thân mềm (SHELLFISH <= 3 bữa/tuần)
    if (stats.shellfishCount >= MAX_SHELLFISH_PER_WEEK) {
      const nonShell = pool.filter((d) => d.proteinSource !== "SHELLFISH");
      if (nonShell.length > 0) pool = nonShell;
    }

    // Nếu bữa trưa cùng ngày đã ăn SHELLFISH thì bữa tối không ăn SHELLFISH nữa
    if (stats.lastProteinSourceToday === "SHELLFISH" && ["trua", "toi"].includes(mealSlotId)) {
      const nonShell = pool.filter((d) => d.proteinSource !== "SHELLFISH");
      if (nonShell.length > 0) pool = nonShell;
    }

    // 4. Khống chế đồ ăn nhanh (FAST_FOOD <= 1 lần/tuần ở bữa sáng)
    if (mealSlotId === "sang" && stats.fastFoodCount >= MAX_FAST_FOOD_BREAKFAST_PER_WEEK) {
      const nonFast = pool.filter((d) => !d.isFastFood);
      if (nonFast.length > 0) pool = nonFast;
    }

    // 5. Food Pairing & Ngữ cảnh văn hóa ẩm thực
    if (["SCENARIO_1", "SCENARIO_2", "SCENARIO_6"].includes(scenario.id) && slot.role === "MAIN_PROTEIN") {
      // Mâm cơm gia đình: Cấm đồ nhắm quán nhậu (chân gà, cánh gà, tai heo, dồi sụn, trứng vịt lộn)
      const familyMeats = pool.filter((d) => !d.isSnackOrBarFood);
      if (familyMeats.length > 0) pool = familyMeats;
    }

    if (mealSlotId === "toi" && slot.role === "STAPLE_CARB") {
      // Bữa tối: Loại bỏ sắn luộc, củ dong gây đầy bụng ban đêm
      const lightCarbs = pool.filter((d) => !d.isNightHeavyCarb);
      if (lightCarbs.length > 0) pool = lightCarbs;
    }

    if (mealSlotId === "sang") {
      // Bữa sáng: Cấm ghép tráng miệng nhiều béo/ngọt (váng sữa Monte, milo) và trái cây ngọt đậm (mít, vải)
      pool = pool.filter((d) => !d.isHighSugar && !d.isHighSugarFruit);
    }

    // 6. Bộ lọc toàn diện cho mục tiêu GIẢM CÂN (giam_can)
    if (goalId === "giam_can") {
      pool = pool.filter(
        (d) =>
          !d.isHeavySoup &&
          !d.isDeepFried &&
          !d.isHighSugar &&
          !d.isOrganMeat &&
          !d.isHighSugarFruit
      );
    }

    if (pool.length === 0) {
      return null;
    }

    const minTol = slot.tolerance[0];
    const maxTol = slot.tolerance[1];
    const subTargetKcal = slotBudget.kcal * ((minTol + maxTol) / 2);
    const subBudget = {
      kcal: subTargetKcal,
      protein_g: slotBudget.protein_g * ((minTol + maxTol) / 2),
      fat_g: slotBudget.fat_g * ((minTol + maxTol) / 2),
      carb_g: slotBudget.carb_g * ((minTol + maxTol) / 2),
    };

    const ranked = pool
      .map((d) => {
        let penalty = 0;
        // Điểm phạt nhẹ nếu cùng ngày đã ăn loại đạm này ở bữa trước
        if (stats.lastProteinSourceToday === d.proteinSource && d.proteinSource !== "OTHER") {
          penalty += 0.5;
        }
        return { dish: d, score: scoreSlotDish(d, slot.role, subBudget, scale) + penalty };
      })
      .sort((a, b) => a.score - b.score);

    slotCandidates.push({
      role: slot.role,
      roleLabel: slot.label,
      tolerance: slot.tolerance,
      candidates: ranked.slice(0, 4).map((r) => r.dish),
      allRanked: ranked.map((r) => r.dish),
    });
  }

  // Kết hợp tổ hợp món từ các slot
  const combos = [];
  function combine(depth, current) {
    if (depth === slotCandidates.length) {
      const ids = new Set(current.map((c) => c.id));
      if (ids.size === current.length) {
        combos.push([...current]);
      }
      return;
    }
    for (const d of slotCandidates[depth].candidates) {
      combine(depth + 1, [...current, d]);
    }
  }
  combine(0, []);

  if (combos.length === 0) return null;

  combos.sort((a, b) => scoreMealCombo(a, slotBudget, scale) - scoreMealCombo(b, slotBudget, scale));
  const bestCombo = combos[0];

  const items = bestCombo.map((d, idx) => {
    const slotInfo = slotCandidates[idx];
    const swapCandidates = slotInfo.allRanked
      .filter((cand) => cand.id !== d.id)
      .slice(0, SWAP_CANDIDATE_COUNT)
      .map((c) => ({
        dishId: c.id,
        nameVi: c.nameVi,
        kcal: c.kcal,
        macros: { protein_g: c.protein_g, fat_g: c.fat_g, carb_g: c.carb_g },
      }));

    return {
      role: slotInfo.role,
      roleLabel: slotInfo.roleLabel,
      dishId: d.id,
      nameVi: d.nameVi,
      kcal: d.kcal,
      macros: { protein_g: d.protein_g, fat_g: d.fat_g, carb_g: d.carb_g },
      swapCandidates,
    };
  });

  const totalKcal = Math.round(items.reduce((s, i) => s + (i.kcal || 0), 0) * 10) / 10;
  const totalMacros = {
    protein_g: Math.round(items.reduce((s, i) => s + (i.macros.protein_g || 0), 0) * 10) / 10,
    fat_g: Math.round(items.reduce((s, i) => s + (i.macros.fat_g || 0), 0) * 10) / 10,
    carb_g: Math.round(items.reduce((s, i) => s + (i.macros.carb_g || 0), 0) * 10) / 10,
  };

  const isNoodle = Boolean(
    scenario.isNoodleFormat || items.some((i) => bestCombo.some((d) => d.dishFormat === "SOUP_NOODLE"))
  );

  const mainProteinItem = bestCombo.find(
    (d, i) => slotCandidates[i]?.role === "MAIN_PROTEIN" || slotCandidates[i]?.role === "NOODLE_MAIN"
  );

  return {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    dishId: items[0]?.dishId,
    nameVi: items.map((i) => i.nameVi).join(" + "),
    kcal: totalKcal,
    macros: totalMacros,
    items,
    isNoodleFormat: isNoodle,
    dishIds: bestCombo.map((d) => d.id),
    proteinSource: mainProteinItem?.proteinSource || "OTHER",
    isFastFood: bestCombo.some((d) => d.isFastFood),
  };
}

// Sinh thực đơn ngày với Scenario Rotation, Dynamic Tolerance Bands, và Fallback
export function generateDishMealPlan({
  pool,
  targetCalories,
  days = 7,
  rules,
  template = DEFAULT_TEMPLATE,
  goalId = "giu_dang",
}) {
  const eligible = filterEligibleDishes(pool, rules);
  if (eligible.length === 0) {
    return {
      days: [],
      warning: "Không có món nào trong bể dữ liệu thoả điều kiện lọc (dị ứng/bệnh nền quá chặt so với dữ liệu hiện có).",
    };
  }

  const dailyTargets = dailyMacroTargets(targetCalories, template);

  // Map lưu dayIndex gần nhất theo cả dishId và normalizedName để chống lặp tuyệt đối
  const dishLastUsedDay = new Map();
  const nameLastUsedDay = new Map();
  const recentScenarioIds = [];
  const outDays = [];

  // Thống kê toàn tuần
  const weeklyStats = {
    shellfishCount: 0,
    fastFoodCount: 0,
    lastProteinSourceToday: null,
  };

  for (let dayIndex = 1; dayIndex <= days; dayIndex++) {
    let consumed = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0 };
    let cumulativePct = 0;
    let dayHadNoodle = false;
    weeklyStats.lastProteinSourceToday = null;
    const dayMeals = [];

    for (const mealType of MEAL_TYPES) {
      cumulativePct += mealType.pct;
      const slotBudget = remainingSlotBudget(dailyTargets, cumulativePct, consumed, mealType.id, template);
      const scale = slotShare(dailyTargets, mealType.pct);

      let eligibleScenarios = getScenariosForGoal(goalId, mealType.id);

      // RÀNG BUỘC CỨNG: Nếu trong ngày đã có món nước (như bún/phở), cấm món nước ở các bữa tiếp theo
      if (dayHadNoodle) {
        eligibleScenarios = eligibleScenarios.filter((s) => !s.isNoodleFormat);
      }

      // Xoay tua kịch bản: sắp xếp kịch bản ít dùng gần đây lên trước
      eligibleScenarios.sort((a, b) => {
        const aRecentIdx = recentScenarioIds.lastIndexOf(a.id);
        const bRecentIdx = recentScenarioIds.lastIndexOf(b.id);
        const aScore = aRecentIdx >= 0 ? recentScenarioIds.length - aRecentIdx : 0;
        const bScore = bRecentIdx >= 0 ? recentScenarioIds.length - bRecentIdx : 0;
        return aScore - bScore;
      });

      let chosenMeal = null;
      for (const scenario of eligibleScenarios) {
        chosenMeal = generateMealForScenario(
          scenario,
          eligible,
          slotBudget,
          scale,
          dishLastUsedDay,
          nameLastUsedDay,
          dayIndex,
          goalId,
          mealType.id,
          weeklyStats
        );
        if (chosenMeal) break;

        // Cơ chế Degradation / Fallback khi kịch bản thiếu món
        let fallback = getFallbackScenario(scenario.id);
        while (fallback && !chosenMeal) {
          chosenMeal = generateMealForScenario(
            fallback,
            eligible,
            slotBudget,
            scale,
            dishLastUsedDay,
            nameLastUsedDay,
            dayIndex,
            goalId,
            mealType.id,
            weeklyStats
          );
          fallback = getFallbackScenario(fallback.id);
        }
        if (chosenMeal) break;
      }

      if (!chosenMeal) {
        return {
          days: [],
          warning: `Không thể tìm thấy tổ hợp món ăn phù hợp cho bữa ${mealType.label} (Ngày ${dayIndex}).`,
        };
      }

      if (chosenMeal.isNoodleFormat) dayHadNoodle = true;
      if (chosenMeal.proteinSource === "SHELLFISH" && ["trua", "toi"].includes(mealType.id)) {
        weeklyStats.shellfishCount++;
      }
      if (chosenMeal.isFastFood && mealType.id === "sang") {
        weeklyStats.fastFoodCount++;
      }
      weeklyStats.lastProteinSourceToday = chosenMeal.proteinSource;

      recentScenarioIds.push(chosenMeal.scenarioId);
      if (recentScenarioIds.length > 8) recentScenarioIds.shift();

      // Cập nhật dayIndex gần nhất cho cả ID và TÊN MÓN chuẩn hóa
      chosenMeal.dishIds.forEach((id) => dishLastUsedDay.set(id, dayIndex));
      chosenMeal.items.forEach((item) => {
        const normName = (item.nameVi || "").toLowerCase().trim();
        nameLastUsedDay.set(normName, dayIndex);
      });

      consumed.kcal += chosenMeal.kcal;
      consumed.protein_g += chosenMeal.macros.protein_g;
      consumed.fat_g += chosenMeal.macros.fat_g;
      consumed.carb_g += chosenMeal.macros.carb_g;

      dayMeals.push({
        mealSlot: mealType.id,
        scenarioId: chosenMeal.scenarioId,
        scenarioLabel: chosenMeal.scenarioLabel,
        dishId: chosenMeal.dishId,
        nameVi: chosenMeal.nameVi,
        kcal: chosenMeal.kcal,
        macros: chosenMeal.macros,
        items: chosenMeal.items,
        swapCandidates: chosenMeal.items[0]?.swapCandidates ?? [],
      });
    }

    const totalDayKcal = Math.round(dayMeals.reduce((s, m) => s + (m.kcal || 0), 0) * 10) / 10;
    outDays.push({ dayIndex, meals: dayMeals, totalKcal: totalDayKcal });
  }

  return { days: outDays };
}

// Đổi 1 món con trong mảng items của 1 mâm cơm (API mới /plan/swap-item)
export function applyItemSwap(meal, itemIndex, chooseDishId) {
  if (!meal.items || !meal.items[itemIndex]) {
    return { ok: false, error: "Không tìm thấy món con cần đổi trong bữa ăn." };
  }

  const targetItem = meal.items[itemIndex];
  const chosenCandidate = targetItem.swapCandidates.find((c) => c.dishId === chooseDishId);
  if (!chosenCandidate) {
    return { ok: false, error: "Món chọn không nằm trong danh sách gợi ý đổi món hợp lệ cho vai trò này." };
  }

  // Đổi món: đưa món cũ vào danh sách swapCandidates của item đó
  const oldItemDish = {
    dishId: targetItem.dishId,
    nameVi: targetItem.nameVi,
    kcal: targetItem.kcal,
    macros: targetItem.macros,
  };

  const updatedCandidates = [oldItemDish, ...targetItem.swapCandidates.filter((c) => c.dishId !== chooseDishId)];

  const updatedItem = {
    ...targetItem,
    dishId: chosenCandidate.dishId,
    nameVi: chosenCandidate.nameVi,
    kcal: chosenCandidate.kcal,
    macros: chosenCandidate.macros,
    swapCandidates: updatedCandidates,
  };

  const updatedItems = [...meal.items];
  updatedItems[itemIndex] = updatedItem;

  const newTotalKcal = Math.round(updatedItems.reduce((s, i) => s + (i.kcal || 0), 0) * 10) / 10;
  const newMacros = {
    protein_g: Math.round(updatedItems.reduce((s, i) => s + (i.macros.protein_g || 0), 0) * 10) / 10,
    fat_g: Math.round(updatedItems.reduce((s, i) => s + (i.macros.fat_g || 0), 0) * 10) / 10,
    carb_g: Math.round(updatedItems.reduce((s, i) => s + (i.macros.carb_g || 0), 0) * 10) / 10,
  };

  const updatedMeal = {
    ...meal,
    nameVi: updatedItems.map((i) => i.nameVi).join(" + "),
    kcal: newTotalKcal,
    macros: newMacros,
    items: updatedItems,
  };

  return { ok: true, meal: updatedMeal };
}

// Đổi món ở mức bữa (tương thích ngược)
export function applySwap(meal, chooseDishId) {
  if (meal.items && meal.items.length > 0) {
    return applyItemSwap(meal, 0, chooseDishId);
  }
  const chosen = meal.swapCandidates?.find((c) => c.dishId === chooseDishId);
  if (!chosen) return { ok: false, error: "Món chọn không nằm trong danh sách gợi ý đổi món hợp lệ cho bữa này." };

  const { mealSlot, swapCandidates, ...current } = meal;
  return { ok: true, meal: { mealSlot, ...chosen, swapCandidates: [current, ...swapCandidates.filter((c) => c !== chosen)] } };
}

// Áp dụng đề xuất AI
export function applyDishSelections({ baseDays, selections, eligible, targetCalories, template, strict = false }) {
  const eligibleById = new Map(eligible.map((d) => [d.id, d]));
  const days = [];

  for (const day of baseDays) {
    const meals = [];
    for (const meal of day.meals) {
      const wanted = selections.get(`${day.dayIndex}:${meal.mealSlot}`);
      if (wanted === undefined || wanted === meal.dishId) {
        meals.push(meal);
        continue;
      }
      const dish = eligibleById.get(wanted);
      if (!dish || (dish.allowedSlots && !dish.allowedSlots.includes(meal.mealSlot))) {
        if (strict) return { ok: false, error: `Món ${wanted} không phù hợp với bữa "${meal.mealSlot}" hoặc không hợp lệ với hồ sơ của bạn.` };
        meals.push(meal);
        continue;
      }
      if (meal.items && meal.items.length > 0) {
        const itemSwapRes = applyItemSwap(meal, 0, wanted);
        if (itemSwapRes.ok) {
          meals.push(itemSwapRes.meal);
          continue;
        }
      }
      meals.push(meal);
    }
    const totalKcal = Math.round(meals.reduce((s, m) => s + (m.kcal || 0), 0) * 10) / 10;
    days.push({ dayIndex: day.dayIndex, meals, totalKcal });
  }
  return { ok: true, days };
}
