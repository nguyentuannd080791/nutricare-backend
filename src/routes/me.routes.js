import { Router } from "express";
import { prisma } from "../services/prismaClient.js";
import { publicUser } from "../services/serializers.js";
import { getAge } from "../domain/bmiLogic.js";
import { HttpError } from "../errors.js";
import { requireText } from "../validation.js";

export const meRouter = Router();

const MIN_AGE = 12;
const GENDERS = ["nam", "nu"];

function parseDob(value) {
  const date = new Date(value);
  const isRealDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  if (!isRealDate) throw new HttpError(400, "Ngày sinh cần đúng định dạng YYYY-MM-DD.");
  if (getAge(value) < MIN_AGE) throw new HttpError(400, `NutriCare dành cho người từ ${MIN_AGE} tuổi trở lên.`);
  return date;
}

meRouter.get("/me", (req, res) => res.json(publicUser(req.user)));

// Cập nhật từng phần hồ sơ: chỉ field nào có trong body mới được sửa.
meRouter.patch("/me", async (req, res) => {
  const { fullName, gender, dob } = req.body;
  const data = {};
  if (fullName !== undefined) data.fullName = requireText(fullName, { label: "Họ tên" });
  if (gender !== undefined) {
    if (!GENDERS.includes(gender)) throw new HttpError(400, "Giới tính không hợp lệ.");
    data.gender = gender;
  }
  if (dob !== undefined) data.dob = parseDob(dob);

  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json(publicUser(user));
});
