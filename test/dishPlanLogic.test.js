import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePortionGram,
  BASE_ROLE_GRAMS,
  generateDishMealPlan,
  applyItemSwap,
} from "../src/domain/dishPlanLogic.js";

test("calculatePortionGram: scales portion in grams and calculates macros accurately", () => {
  const riceDish = {
    id: 1248,
    nameVi: "Cơm gạo lứt",
    kcal: 165.8,
    protein_g: 3.9,
    fat_g: 1.4,
    carb_g: 34.5,
    serving_g: 150,
  };

  // Base test: when subTarget matches base kcal, gram should equal baseWeight
  const basePortion = calculatePortionGram(riceDish, "STAPLE_CARB", 165.8);
  assert.equal(basePortion.gram, 150);
  assert.ok(basePortion.serving.includes("150g"));
  assert.ok(basePortion.serving.includes("1 chén vừa"));
  assert.equal(basePortion.scaledKcal, 165.8);
  assert.equal(basePortion.scaledMacros.carb_g, 34.5);

  // Scaled up test: higher carb allocation (e.g. 220 kcal)
  const scaledUp = calculatePortionGram(riceDish, "STAPLE_CARB", 220);
  assert.ok(scaledUp.gram > 150);
  assert.equal(scaledUp.gram % 5, 0); // Must be multiple of 5g
  assert.ok(scaledUp.scaledKcal > 165.8);
  assert.ok(scaledUp.scaledMacros.carb_g > 34.5);
  assert.ok(scaledUp.serving.includes(`${scaledUp.gram}g`));

  // Scaled down test: lower calorie allocation (e.g. 110 kcal)
  const scaledDown = calculatePortionGram(riceDish, "STAPLE_CARB", 110);
  assert.ok(scaledDown.gram < 150);
  assert.equal(scaledDown.gram % 5, 0);
  assert.ok(scaledDown.scaledKcal < 165.8);
});

test("dishPlanLogic: generates meal plan with rich gram portions and scaled combo items", () => {
  const samplePool = [
    {
      id: 1248,
      nameVi: "Cơm gạo lứt",
      groupId: 12,
      kcal: 165.8,
      protein_g: 3.9,
      fat_g: 1.4,
      carb_g: 34.5,
      dishFormat: "STAPLE_CARB",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["sang", "trua", "toi"],
    },
    {
      id: 1250,
      nameVi: "Ức gà luộc xé phay",
      groupId: 6,
      kcal: 165.0,
      protein_g: 31.0,
      fat_g: 3.6,
      carb_g: 0.0,
      dishFormat: "BOILED_MEAT",
      proteinSource: "POULTRY",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 1252,
      nameVi: "Bông cải xanh luộc",
      groupId: 13,
      kcal: 45.0,
      protein_g: 3.7,
      fat_g: 0.6,
      carb_g: 6.9,
      dishFormat: "BOILED_VEG",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 2001,
      nameVi: "Canh bí xanh nấu thịt nạc",
      groupId: 14,
      kcal: 65.0,
      protein_g: 6.5,
      fat_g: 2.1,
      carb_g: 5.0,
      dishFormat: "LIGHT_SOUP",
      serving_g: 200,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 1249,
      nameVi: "Cơm gạo lứt huyết rồng",
      groupId: 12,
      kcal: 160.0,
      protein_g: 4.2,
      fat_g: 1.2,
      carb_g: 33.1,
      dishFormat: "STAPLE_CARB",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["sang", "trua", "toi"],
    },
    {
      id: 1251,
      nameVi: "Cá lóc hấp hành gừng",
      groupId: 6,
      kcal: 145.0,
      protein_g: 27.3,
      fat_g: 3.4,
      carb_g: 1.2,
      dishFormat: "BOILED_MEAT",
      proteinSource: "FISH",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 2002,
      nameVi: "Rau muống luộc",
      groupId: 13,
      kcal: 35.0,
      protein_g: 3.2,
      fat_g: 0.3,
      carb_g: 5.4,
      dishFormat: "BOILED_VEG",
      serving_g: 150,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 2003,
      nameVi: "Canh cua nấu mồng tơi",
      groupId: 14,
      kcal: 55.0,
      protein_g: 5.8,
      fat_g: 1.5,
      carb_g: 4.5,
      dishFormat: "LIGHT_SOUP",
      serving_g: 200,
      isHealthy: true,
      allowedSlots: ["trua", "toi"],
    },
    {
      id: 3001,
      nameVi: "Phở gà nạc nước trong",
      groupId: 1,
      kcal: 420.0,
      protein_g: 32.0,
      fat_g: 7.0,
      carb_g: 58.0,
      dishFormat: "SOUP_NOODLE",
      proteinSource: "POULTRY",
      serving_g: 450,
      isHealthy: true,
      allowedSlots: ["sang"],
    },
    {
      id: 4001,
      nameVi: "Táo tươi giòn",
      groupId: 18,
      kcal: 60.0,
      protein_g: 0.5,
      fat_g: 0.2,
      carb_g: 15.0,
      dishFormat: "FRUIT_RAW",
      serving_g: 120,
      isHealthy: true,
      allowedSlots: ["sang", "an_vat"],
    },
  ];

  const planResult = generateDishMealPlan({
    pool: samplePool,
    targetCalories: 1800,
    days: 1,
    rules: { excludeTags: [], conditionLimits: {}, userConditions: [] },
    goalId: "giu_dang",
  });

  assert.equal(planResult.days.length, 1);
  const day = planResult.days[0];
  assert.ok(day.meals.length >= 3);

  // Kiểm tra bữa trưa hoặc tối (mâm cơm gia đình combo)
  const mainMeal = day.meals.find((m) => m.mealSlot === "trua" || m.mealSlot === "toi");
  assert.ok(mainMeal);
  assert.ok(mainMeal.gram > 0);
  assert.ok(typeof mainMeal.serving === "string");
  assert.ok(Array.isArray(mainMeal.items));
  assert.ok(mainMeal.items.length > 0);

  // Mỗi món con phải có gram, serving, và scaled macros
  const firstItem = mainMeal.items[0];
  assert.ok(firstItem.gram > 0);
  assert.ok(typeof firstItem.serving === "string");
  assert.ok(firstItem.serving.includes("g"));
  assert.ok(firstItem.kcal > 0);
  assert.ok(firstItem.macros.carb_g !== undefined || firstItem.macros.protein_g !== undefined);
});

test("applyItemSwap: updates meal items and recalculates grams correctly", () => {
  const meal = {
    mealSlot: "trua",
    dishId: 101,
    nameVi: "Cơm tẻ + Thịt kho",
    kcal: 500,
    gram: 300,
    serving: "150g Cơm tẻ + 150g Thịt kho",
    macros: { protein_g: 25, fat_g: 20, carb_g: 50 },
    items: [
      {
        role: "STAPLE_CARB",
        dishId: 101,
        nameVi: "Cơm tẻ",
        gram: 150,
        serving: "150g (1 chén vừa)",
        kcal: 200,
        macros: { protein_g: 4, fat_g: 1, carb_g: 44 },
        swapCandidates: [
          {
            dishId: 1248,
            nameVi: "Cơm gạo lứt",
            gram: 150,
            serving: "150g (1 chén vừa)",
            kcal: 165.8,
            macros: { protein_g: 3.9, fat_g: 1.4, carb_g: 34.5 },
          },
        ],
      },
      {
        role: "MAIN_PROTEIN",
        dishId: 102,
        nameVi: "Thịt kho",
        gram: 150,
        serving: "150g",
        kcal: 300,
        macros: { protein_g: 21, fat_g: 19, carb_g: 6 },
        swapCandidates: [],
      },
    ],
  };

  const swapResult = applyItemSwap(meal, 0, 1248);
  assert.equal(swapResult.ok, true);
  const updated = swapResult.meal;

  assert.equal(updated.items[0].dishId, 1248);
  assert.equal(updated.items[0].nameVi, "Cơm gạo lứt");
  assert.equal(updated.items[0].gram, 150);
  assert.equal(updated.items[0].kcal, 165.8);
  assert.equal(updated.kcal, 465.8);
  assert.ok(updated.nameVi.includes("Cơm gạo lứt"));
  assert.ok(updated.serving.includes("150g Cơm gạo lứt"));
});
