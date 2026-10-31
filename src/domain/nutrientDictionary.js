// Từ điển nutrient CHUẨN HOÁ — mỗi field trong bảng `dishes` map với ĐÚNG 1
// tên tiếng Việt duy nhất ở đây, dùng để hiển thị ở API /dishes/:id.
//
// Bối cảnh: dữ liệu nguồn (02_source_data.sql, 04_adjusted_data.sql) có
// nhiều tên đồng nghĩa trỏ tới cùng 1 khái niệm (vd "Canxi"/"Calcium",
// "Sắt"/"Iron", "Xơ"/"Chất xơ", "Carbohydrate"/"Chất bột đường"/"CarbGlucid")
// do được scrape từ nhiều phiên bản trang khác nhau. Việc gộp về 1 field
// duy nhất đã làm ở bước chuẩn hoá dữ liệu (xem CHANGELOG_DISH_CATALOG.md) —
// dictionary này chỉ là lớp HIỂN THỊ, ánh xạ field -> tên tiếng Việt chọn làm
// chuẩn (ưu tiên tên thuần Việt, phổ thông, đúng theo cách NIN hay dùng).
export const NUTRIENT_DICTIONARY = {
  protein_g: { nameVi: "Chất đạm", unit: "g", category: "PROXIMATE" },
  fat_g: { nameVi: "Chất béo", unit: "g", category: "PROXIMATE" },
  carb_g: { nameVi: "Chất bột đường", unit: "g", category: "PROXIMATE" },
  fiber_g: { nameVi: "Chất xơ", unit: "g", category: "PROXIMATE" },
  sodium_mg: { nameVi: "Natri", unit: "mg", category: "MINERAL" },
  salt_g: { nameVi: "Tương đương muối", unit: "g", category: "OTHER" },
  cholesterol_mg: { nameVi: "Cholesterol", unit: "mg", category: "OTHER" },
  calcium_mg: { nameVi: "Canxi", unit: "mg", category: "MINERAL" },
  iron_mg: { nameVi: "Sắt", unit: "mg", category: "MINERAL" },
  zinc_mg: { nameVi: "Kẽm", unit: "mg", category: "MINERAL" },
  magnesium_mg: { nameVi: "Magie", unit: "mg", category: "MINERAL" },
  potassium_mg: { nameVi: "Kali", unit: "mg", category: "MINERAL" },
  vitaminA_mcg: { nameVi: "Vitamin A", unit: "mcg", category: "VITAMIN" },
  vitaminC_mg: { nameVi: "Vitamin C", unit: "mg", category: "VITAMIN" },
  betacarotenMcg: { nameVi: "Beta-caroten", unit: "mcg", category: "OTHER" },
  transfatMg: { nameVi: "Transfat", unit: "mg", category: "FATTY_ACID" },
  mufaPufaG: { nameVi: "MUFA + PUFA", unit: "g", category: "FATTY_ACID" },
};

// Thứ tự hiển thị trong màn hình chi tiết món ăn: nhóm chính (PROXIMATE) lên
// trước, rồi vitamin, khoáng chất, cuối cùng là "khác".
const CATEGORY_ORDER = ["PROXIMATE", "VITAMIN", "MINERAL", "FATTY_ACID", "OTHER"];

// dish: bản ghi từ Prisma (field camelCase như proteinG, fatG,...) — trả về
// mảng {key, nameVi, unit, category, value} đã lọc null và sắp xếp để hiển
// thị, dùng cho GET /dishes/:id.
export function buildNutrientBreakdown(dish) {
  const FIELD_TO_DISH_KEY = {
    protein_g: "proteinG",
    fat_g: "fatG",
    carb_g: "carbG",
    fiber_g: "fiberG",
    sodium_mg: "sodiumMg",
    salt_g: "saltG",
    cholesterol_mg: "cholesterolMg",
    calcium_mg: "calciumMg",
    iron_mg: "ironMg",
    zinc_mg: "zincMg",
    magnesium_mg: "magnesiumMg",
    potassium_mg: "potassiumMg",
    vitaminA_mcg: "vitaminAMcg",
    vitaminC_mg: "vitaminCMg",
    betacarotenMcg: "betacarotenMcg",
    transfatMg: "transfatMg",
    mufaPufaG: "mufaPufaG",
  };

  const rows = Object.entries(NUTRIENT_DICTIONARY)
    .map(([key, meta]) => ({
      key,
      ...meta,
      value: dish[FIELD_TO_DISH_KEY[key]] ?? null,
    }))
    .filter((r) => r.value !== null);

  return rows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}
