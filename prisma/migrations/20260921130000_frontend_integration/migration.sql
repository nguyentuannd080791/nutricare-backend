-- Hồ sơ người dùng (đầu vào công thức Mifflin-St Jeor) + tên hiển thị.
ALTER TABLE "users"
  ADD COLUMN "full_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "dob" TIMESTAMP(3);

-- Loại bệnh nền/dị ứng; bỏ "tags" vì luật lọc luôn được suy ra lại từ tên.
ALTER TABLE "health_conditions"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'BENH_NEN',
  DROP COLUMN "tags";

-- Thời hạn áp dụng, nguyên nhân tạo target, mốc chạy Feedback Loop gần nhất.
ALTER TABLE "nutrition_targets"
  ADD COLUMN "duration_months" INTEGER,
  ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'initial',
  ADD COLUMN "last_feedback_check_at" TIMESTAMP(3);

-- Mỗi user chỉ có tối đa 1 target / 1 thực đơn đang active (partial unique
-- index — Prisma schema không khai báo được, xem ghi chú đầu schema.prisma).
CREATE UNIQUE INDEX "nutrition_targets_one_active_per_user" ON "nutrition_targets"("user_id") WHERE "is_active" = true;
CREATE UNIQUE INDEX "meal_plans_one_active_per_user" ON "meal_plans"("user_id") WHERE "is_active" = true;
