import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { loadConditions } from "../services/conditionService.js";
import { conditionView } from "../services/serializers.js";
import { CONDITION_TYPES } from "../domain/constants.js";
import { HttpError } from "../errors.js";
import { requireText } from "../validation.js";

export const healthRouter = Router();

// Tên bệnh/dị ứng là văn bản tự do; toàn bộ luật lọc món được suy ra từ tên
// mỗi lần cần (xem domain/conditionRules.js) nên không lưu kết quả suy luận.
function parseCondition(body) {
  const name = requireText(body.name, { label: "Tên bệnh nền/dị ứng" });
  if (!CONDITION_TYPES.some((t) => t.id === body.type)) throw new HttpError(400, "Loại không hợp lệ.");
  return { name, type: body.type };
}

healthRouter.get("/health-conditions", async (req, res) => {
  res.json((await loadConditions(req.user.id)).map(conditionView));
});

healthRouter.post("/health-conditions", async (req, res) => {
  const row = await prisma.healthCondition.create({ data: { userId: req.user.id, ...parseCondition(req.body) } });
  res.status(201).json(conditionView(row));
});

healthRouter.put("/health-conditions/:id", async (req, res) => {
  const existing = await prisma.healthCondition.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) throw new HttpError(404, "Không tìm thấy mục cần sửa.");

  const row = await prisma.healthCondition.update({ where: { id: existing.id }, data: parseCondition(req.body) });
  res.json(conditionView(row));
});

healthRouter.delete("/health-conditions/:id", async (req, res) => {
  await prisma.healthCondition.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  res.status(204).end();
});
