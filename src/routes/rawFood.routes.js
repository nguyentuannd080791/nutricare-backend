import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { HttpError } from "../errors.js";
import { parsePaging, parseIdParam } from "../validation.js";
import { optionalAuth } from "../middleware/auth.js";
import { loadConditions } from "../services/conditionService.js";
import { findConflictingConditions } from "../domain/conditionRules.js";

export const rawFoodRouter = Router();

// Catalog công khai, không cần đăng nhập - giống catalog.routes.js (dishes).
// Nguồn: nin_source_long.csv (NIN, 847 thực phẩm tự nhiên, 150 nutrient).
const conditionsOf = (req) => (req.user ? loadConditions(req.user.id) : []);

// GET /raw-foods?query=&groupId= - cơ bản: tên, nhóm, kcal + 3 macro chính
// (macro lấy qua include nutrients rồi lọc, vì đây là bảng EAV không có flat column).
rawFoodRouter.get("/raw-foods", optionalAuth, async (req, res) => {
  const { query, groupId } = req.query;
  const { page, pageSize, skip } = parsePaging(req.query);

  const where = {
    ...(groupId ? { groupId: Number(groupId) } : {}),
    ...(query ? { nameVi: { contains: query, mode: "insensitive" } } : {}),
  };

  const [rows, total, conditions] = await Promise.all([
    prisma.rawFood.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { nameVi: "asc" },
      include: { group: true, nutrients: { where: { nutrient: { code: { in: ["chat_dam", "chat_beo_fat", "chat_bot_duong"] } } }, include: { nutrient: true } } },
    }),
    prisma.rawFood.count({ where }),
    conditionsOf(req),
  ]);

  const items = rows.map((f) => {
    const byCode = Object.fromEntries(f.nutrients.map((n) => [n.nutrient.code, n.amount]));
    const itemObj = {
      id: f.id,
      nameVi: f.nameVi,
      nameEn: f.nameEn,
      kcal: f.kcal,
      protein_g: byCode.chat_dam ?? null,
      fat_g: byCode.chat_beo_fat ?? null,
      carb_g: byCode.chat_bot_duong ?? null,
    };
    return {
      ...itemObj,
      groupNameVi: f.group.nameVi,
      conflicts: findConflictingConditions(itemObj, conditions),
    };
  });

  res.json({ items, page, pageSize, total });
});

rawFoodRouter.get("/raw-foods/groups", async (_req, res) => {
  const groups = await prisma.rawFoodGroup.findMany({ orderBy: { id: "asc" } });
  res.json(groups);
});

// GET /raw-foods/:id - chi tiết đầy đủ, tối đa 150 nutrient (chỉ trả những
// nutrient thực phẩm này có số liệu), nhóm theo category, sắp theo display_order.
rawFoodRouter.get("/raw-foods/:id", optionalAuth, async (req, res) => {
  const [food, conditions] = await Promise.all([
    prisma.rawFood.findUnique({
      where: { id: parseIdParam(req.params.id, "Không tìm thấy thực phẩm") },
      include: { group: true, nutrients: { include: { nutrient: true }, orderBy: { nutrient: { displayOrder: "asc" } } } },
    }),
    conditionsOf(req),
  ]);
  if (!food) throw new HttpError(404, "Không tìm thấy thực phẩm");

  const byCode = Object.fromEntries(food.nutrients.map((n) => [n.nutrient.code, n.amount]));
  const itemObj = {
    id: food.id,
    nameVi: food.nameVi,
    nameEn: food.nameEn,
    kcal: food.kcal,
    protein_g: byCode.chat_dam ?? null,
    fat_g: byCode.chat_beo_fat ?? null,
    carb_g: byCode.chat_bot_duong ?? null,
    sodium_mg: byCode.natri_na ?? null,
    potassium_mg: byCode.kali_k ?? null,
  };

  res.json({
    ...itemObj,
    groupNameVi: food.group.nameVi,
    tagLabels: [],
    conflicts: findConflictingConditions(itemObj, conditions),
    nutrients: food.nutrients.map((n) => ({
      code: n.nutrient.code,
      nameVi: n.nutrient.nameVi,
      unit: n.nutrient.unit,
      category: n.nutrient.category,
      value: n.amount,
    })),
  });
});
