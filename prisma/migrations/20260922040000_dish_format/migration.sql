-- Kiểu chế biến của món (SOUP_NOODLE, DESSERT_SWEET...) — dùng làm "category"
-- để thuật toán chống lặp nhóm món trong ngày và suy ra bữa phù hợp
-- (domain/mealContext.js). Trước đây dữ liệu này chỉ nằm trong
-- seed-data/dishes.json, chưa từng được đọc lên DB.
ALTER TABLE "dishes" ADD COLUMN "dish_format" TEXT;
