import { PrismaClient } from "@prisma/client";
import { tagDish } from "../src/domain/dishTagging.js";
import dishGroups from "./seed-data/dish_groups.json" with { type: "json" };
import dishes from "./seed-data/dishes.json" with { type: "json" };
import rawNutrients from "./seed-data/raw_nutrients.json" with { type: "json" };
import rawFoodGroups from "./seed-data/raw_food_groups.json" with { type: "json" };
import rawFoods from "./seed-data/raw_foods.json" with { type: "json" };
import rawFoodNutrients from "./seed-data/raw_food_nutrients.json" with { type: "json" };

const prisma = new PrismaClient();

async function seedDishGroups() {
  for (const g of dishGroups) {
    await prisma.dishGroup.upsert({
      where: { id: g.id },
      update: {},
      create: { id: g.id, nameVi: g.nameVi, nameEn: g.nameEn },
    });
  }
  console.log(`Đã seed ${dishGroups.length} nhóm món ăn.`);
}

async function seedDishes() {
  // Đồng bộ và dọn dẹp các món trùng lặp đã bị loại bỏ khỏi seed-data
  const activeIds = dishes.map((d) => d.id);
  const deleted = await prisma.dish.deleteMany({ where: { id: { notIn: activeIds } } });
  if (deleted.count > 0) {
    console.log(`Đã loại bỏ ${deleted.count} món ăn trùng lặp khỏi CSDL.`);
  }

  // batch nhỏ để tránh 1 statement quá lớn
  const BATCH = 200;
  for (let i = 0; i < dishes.length; i += BATCH) {
    const batch = dishes.slice(i, i + BATCH);
    await Promise.all(
      batch.map((d) =>
        prisma.dish.upsert({
          where: { id: d.id },
          // Cập nhật lại cả thông tin dinh dưỡng và tag chuẩn hóa trên DB
          update: {
            nameVi: d.nameVi,
            kcal: d.kcal,
            proteinG: d.protein_g,
            fatG: d.fat_g,
            carbG: d.carb_g,
            dishFormat: d.dishFormat,
            tags: tagDish(d.nameVi),
          },
          create: {
            id: d.id,
            code: d.code,
            groupId: d.groupId,
            nameVi: d.nameVi,
            nameEn: d.nameEn,
            kcal: d.kcal,
            proteinG: d.protein_g,
            fatG: d.fat_g,
            carbG: d.carb_g,
            fiberG: d.fiber_g,
            sodiumMg: d.sodium_mg,
            saltG: d.salt_g,
            cholesterolMg: d.cholesterol_mg,
            calciumMg: d.calcium_mg,
            ironMg: d.iron_mg,
            zincMg: d.zinc_mg,
            magnesiumMg: d.magnesium_mg,
            potassiumMg: d.potassium_mg,
            vitaminAMcg: d.vitaminA_mcg,
            vitaminCMg: d.vitaminC_mg,
            betacarotenMcg: d.betacaroten_mcg,
            transfatMg: d.transfat_mg,
            mufaPufaG: d.mufa_pufa_g,
            sourceUrl: d.sourceUrl,
            dishFormat: d.dishFormat,
            tags: tagDish(d.nameVi),
          },
        })
      )
    );
  }
  console.log(`Đã seed ${dishes.length} món ăn.`);
}

async function seedRawNutrients() {
  for (const n of rawNutrients) {
    await prisma.rawNutrient.upsert({
      where: { id: n.id },
      update: {},
      create: { id: n.id, code: n.code, nameVi: n.name, unit: n.unit, category: n.category, displayOrder: n.display_order },
    });
  }
  console.log(`Đã seed ${rawNutrients.length} nutrient (thực phẩm).`);
}

async function seedRawFoodGroups() {
  for (const g of rawFoodGroups) {
    await prisma.rawFoodGroup.upsert({ where: { id: g.id }, update: {}, create: { id: g.id, nameVi: g.nameVi } });
  }
  console.log(`Đã seed ${rawFoodGroups.length} nhóm thực phẩm.`);
}

async function seedRawFoods() {
  const BATCH = 200;
  for (let i = 0; i < rawFoods.length; i += BATCH) {
    const batch = rawFoods.slice(i, i + BATCH);
    await Promise.all(
      batch.map((f) =>
        prisma.rawFood.upsert({
          where: { id: f.id },
          update: { nameVi: f.nameVi, kcal: f.kcal },
          create: { id: f.id, nameVi: f.nameVi, nameEn: f.nameEn, groupId: f.groupId, kcal: f.kcal },
        })
      )
    );
  }
  console.log(`Đã seed ${rawFoods.length} thực phẩm (NIN, có tên đầy đủ từ nin_source_long.csv).`);
}

async function seedRawFoodNutrients() {
  const BATCH = 500;
  for (let i = 0; i < rawFoodNutrients.length; i += BATCH) {
    const batch = rawFoodNutrients.slice(i, i + BATCH);
    await prisma.rawFoodNutrient.createMany({
      data: batch.map((r) => ({ foodId: r.food_id, nutrientId: r.nutrient_id, amount: r.amount })),
      skipDuplicates: true,
    });
  }
  console.log(`Đã seed ${rawFoodNutrients.length} dòng nutrient cho thực phẩm.`);
}

async function main() {
  await seedDishGroups();
  await seedDishes();
  await seedRawNutrients();
  await seedRawFoodGroups();
  await seedRawFoods();
  await seedRawFoodNutrients();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
