import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { optionalAuth } from "../middleware/auth.js";
import { loadConditions } from "../services/conditionService.js";
import { toPoolDish, toDishSummary } from "../services/dishCatalog.js";
import { buildNutrientBreakdown } from "../domain/nutrientDictionary.js";
import { findConflictingConditions } from "../domain/conditionRules.js";
import { AVOID_TAG_LABELS } from "../domain/constants.js";
import { HttpError } from "../errors.js";
import { parsePaging, parseIdParam } from "../validation.js";

export const catalogRouter = Router();

// Catalog món ăn là dữ liệu công khai. Nếu request có token hợp lệ, mỗi món
// kèm `conflicts` (tên các bệnh nền/dị ứng của user mà món này vi phạm).
const conditionsOf = (req) => (req.user ? loadConditions(req.user.id) : []);

// GET /dishes?query=&groupId=&page=&pageSize= — CHỈ thông tin cơ bản; đầy đủ
// vi chất ở GET /dishes/:id.
catalogRouter.get("/dishes", optionalAuth, async (req, res) => {
  const { query, groupId } = req.query;
  const { page, pageSize, skip } = parsePaging(req.query);

  const groupIdFilter = Number.parseInt(groupId, 10);
  const where = {
    ...(Number.isInteger(groupIdFilter) ? { groupId: groupIdFilter } : {}),
    ...(query ? { nameVi: { contains: query, mode: "insensitive" } } : {}),
  };

  const [rows, total, conditions] = await Promise.all([
    prisma.dish.findMany({ where, skip, take: pageSize, orderBy: { nameVi: "asc" }, include: { group: true } }),
    prisma.dish.count({ where }),
    conditionsOf(req),
  ]);

  const items = rows.map((row) => {
    const dish = toPoolDish(row);
    return { ...toDishSummary(dish, row.group.nameVi), conflicts: findConflictingConditions(dish, conditions) };
  });
  res.json({ items, page, pageSize, total });
});

catalogRouter.get("/dishes/groups", async (_req, res) => {
  res.json(await prisma.dishGroup.findMany({ orderBy: { id: "asc" } }));
});

// Chi tiết đầy đủ: toàn bộ thành phần dinh dưỡng (tên tiếng Việt đã chuẩn hoá,
// xem domain/nutrientDictionary.js) + tag dị ứng.
catalogRouter.get("/dishes/:id", optionalAuth, async (req, res) => {
  const id = parseIdParam(req.params.id, "Không tìm thấy món ăn.");
  const row = await prisma.dish.findUnique({ where: { id }, include: { group: true } });
  if (!row) throw new HttpError(404, "Không tìm thấy món ăn.");

  const dish = toPoolDish(row);
  res.json({
    ...toDishSummary(dish, row.group.nameVi),
    code: row.code,
    tagLabels: row.tags.map((t) => AVOID_TAG_LABELS[t] ?? t),
    nutrients: buildNutrientBreakdown(row),
    sourceUrl: row.sourceUrl,
    conflicts: findConflictingConditions(dish, await conditionsOf(req)),
  });
});
