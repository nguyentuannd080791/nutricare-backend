// Bối cảnh bữa ăn: món nào hợp với bữa nào. Dùng `dishFormat` (kiểu chế
// biến, gán sẵn trên mỗi món trong seed-data/dishes.json — vd "SOUP_NOODLE",
// "DESSERT_SWEET"...) làm khoá tra — đây cũng chính là "category" dùng ở
// dishPlanLogic.js để chống lặp NHÓM món trong 1 ngày (không chỉ chống lặp
// đúng 1 món).
//
// CẢNH BÁO: đây là suy đoán hợp lý ở mức NHÓM (20 dishFormat), không phải
// gán tay từng món trong 1.247 món — vd không phải mọi "WRAPPED_CAKE_CHA_NEM"
// đều hợp ăn vặt. Đủ để thuật toán không xếp "Chè" vào bữa sáng chính hay
// "Lẩu" vào bữa ăn vặt, nhưng vẫn cần rà lại thủ công nếu muốn chính xác
// tới từng món trước khi dùng cho người dùng thật.
const ALLOWED_SLOTS_BY_FORMAT = {
  STAPLE_CARB: ["sang", "trua", "toi"], // cơm tẻ, khoai lang, ngô luộc... - bữa chính & sáng
  SOUP_NOODLE: ["sang", "trua", "toi"], // phở, bún, hủ tiếu... - bữa chính
  RICE_PORRIDGE_STICKY: ["sang", "trua", "toi"], // cơm, cháo, xôi
  WRAPPED_CAKE_CHA_NEM: ["sang", "trua", "toi", "an_vat"], // bánh cuốn, chả, nem - linh hoạt
  DESSERT_SWEET: ["an_vat"], // chè, tráng miệng - chỉ ăn vặt
  FRIED_RANG: ["trua", "toi"], // chiên rang
  DEEP_FRIED: ["trua", "toi"], // chiên rán
  BOILED_STEAMED: ["trua", "toi"], // luộc, hấp
  BOILED_MEAT: ["trua", "toi"], // đạm luộc/hấp
  BOILED_VEG: ["trua", "toi"], // rau luộc
  STIR_FRY: ["trua", "toi"], // xào
  STIR_FRIED_MEAT: ["trua", "toi"], // thịt xào
  STIR_FRIED_VEG: ["trua", "toi"], // rau xào
  GRILLED: ["trua", "toi"], // nướng
  GRILLED_ROASTED: ["trua", "toi"], // nướng quay
  BRAISED_STEWED: ["trua", "toi"], // kho, hầm
  BRAISED_SIMMERED: ["trua", "toi"], // kho rim
  BEVERAGE: ["sang", "an_vat"], // đồ uống
  FRUIT_RAW: ["sang", "trua", "toi", "an_vat"], // trái cây
  DRY_NOODLE: ["sang", "trua", "toi"], // mì khô, mì trộn
  BREAD_BURGER: ["sang", "trua"], // bánh mì, burger
  SOUP_SIDE: ["trua", "toi"], // canh - món ăn kèm
  LIGHT_SOUP: ["trua", "toi"], // canh rau thanh lọc
  HEAVY_SOUP: ["trua", "toi"], // canh hầm sườn/xương
  PACKAGED_SNACK: ["an_vat"], // ăn vặt đóng gói - cấm bữa chính
  SALAD_MIX: ["trua", "toi", "an_vat"], // salad, gỏi, nộm
  SALAD_GOI: ["trua", "toi", "an_vat"], // gỏi, nộm, salad
  ROLLS_WRAPS: ["sang", "trua", "toi", "an_vat"], // món cuốn
  PICKLED_RAW: ["trua", "toi"], // dưa muối, rau sống
  HOTPOT: ["trua", "toi"], // lẩu
  SUSHI: ["trua", "toi"],
  OTHER_UNCLASSIFIED: ["sang", "trua", "toi", "an_vat"],
};

const ALL_SLOTS = ["sang", "trua", "toi", "an_vat"];

// Không có dishFormat hoặc giá trị lạ (dữ liệu tương lai chưa cập nhật bảng
// trên) → cho phép mọi bữa thay vì loại bỏ món khỏi mọi bữa (fail-open trên
// dữ liệu thiếu, khác với luật y tế/dị ứng vốn phải fail-closed).
export function allowedSlotsFor(dishFormat) {
  return ALLOWED_SLOTS_BY_FORMAT[dishFormat] ?? ALL_SLOTS;
}
