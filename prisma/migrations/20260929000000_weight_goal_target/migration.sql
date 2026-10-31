-- Mục tiêu giảm/tăng cân theo số kg: lưu cân nặng đích và độ lệch calo mỗi ngày
-- (giữ nguyên khi tự tính lại theo cân nặng mới).
ALTER TABLE "nutrition_targets"
  ADD COLUMN "target_weight_kg" DOUBLE PRECISION,
  ADD COLUMN "daily_kcal_delta" INTEGER;

-- Target giảm/tăng cân tạo trước đây dùng hệ số cố định: suy ngược độ lệch calo
-- từ calo và TDEE đã lưu để chúng vẫn tự tính lại đúng. Cân nặng đích để NULL.
UPDATE "nutrition_targets"
  SET "daily_kcal_delta" = "calories" - "tdee"
  WHERE "goal_id" IN ('giam_can', 'tang_can');
