// Hằng số + bảng tra của domain — nguồn DUY NHẤT cho công thức/ngưỡng/nhãn
// (frontend chỉ giữ nhãn hiển thị, không lặp lại công thức).

export const AVOID_TAG_LABELS = {
  duong_cao: "Đường cao",
  natri_cao: "Natri (muối) cao",
  hai_san: "Hải sản",
  dau_phong: "Đậu phộng",
  sua: "Sữa / lactose",
  gluten: "Gluten",
  purin_cao: "Purin cao",
  dam_cao: "Đạm động vật cao",
  thit_ca: "Thịt / cá (không chay)",
  // [2026-09-20] Bổ sung - CONDITION_KEYWORD_MAP đã tham chiếu tag này từ
  // trước (bệnh mỡ máu/cholesterol) nhưng label bị thiếu, tra cứu ra
  // undefined khi hiển thị. Sửa kèm luôn khi mở rộng phần dinh dưỡng.
  dau_mo_cao: "Chất béo/cholesterol cao",
};

// Ánh xạ từ khoá trong tên bệnh nền -> các tag cần tránh khi xây thực đơn.
export const CONDITION_KEYWORD_MAP = [
  {
    keywords: ["tiểu đường", "đái tháo đường", "tieu duong"],
    tags: ["duong_cao"],
  },
  {
    keywords: ["cao huyết áp", "huyết áp cao", "tăng huyết áp"],
    tags: ["natri_cao"],
  },
  { keywords: ["gout", "gút"], tags: ["purin_cao"] },
  { keywords: ["suy thận", "thận yếu"], tags: ["dam_cao", "natri_cao"] },
  {
    keywords: ["dị ứng hải sản", "dị ứng tôm", "dị ứng cua", "dị ứng cá"],
    tags: ["hai_san"],
  },
  { keywords: ["dị ứng đậu phộng", "dị ứng lạc"], tags: ["dau_phong"] },
  {
    keywords: ["dị ứng sữa", "không dung nạp lactose", "lactose"],
    tags: ["sua"],
  },
  { keywords: ["ăn chay", "thuần chay", "chay trường"], tags: ["thit_ca"] },
  { keywords: ["không dung nạp gluten", "celiac", "gluten"], tags: ["gluten"] },
  { keywords: ["mỡ máu", "cholesterol", "gan nhiễm mỡ"], tags: ["dau_mo_cao"] },
];

export function matchConditionTags(name) {
  const lower = (name || "").toLowerCase();
  const tags = new Set();
  for (const entry of CONDITION_KEYWORD_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      entry.tags.forEach((t) => tags.add(t));
    }
  }
  return Array.from(tags);
}

export const CONDITION_TYPES = [
  { id: "BENH_NEN", label: "Bệnh nền" },
  { id: "DI_UNG", label: "Dị ứng" },
  { id: "CHI_DINH_BAC_SI", label: "Chỉ định của bác sĩ" },
];

// [2026-09-20] NGƯỠNG DINH DƯỠNG THEO BỆNH NỀN - áp dụng ở mức "1 món ăn"
// (không phải/ngày), lọc món trong bể dữ liệu 1247 món trước khi đưa vào
// thuật toán chọn thực đơn. Khác với CONDITION_KEYWORD_MAP ở trên (loại bỏ
// theo TAG, dùng cho dị ứng/không thể ăn tuyệt đối), bảng này lọc theo GIÁ
// TRỊ SỐ - dùng cho bệnh cần kiểm soát định lượng.
//
// CẢNH BÁO: các ngưỡng dưới đây là SUY ĐOÁN dựa trên khuyến nghị dinh dưỡng
// công cộng phổ biến (không phải chỉ định lâm sàng cá nhân hoá), chỉ để có
// baseline chạy thuật toán trong giai đoạn test. BẮT BUỘC phải có bác sĩ/
// chuyên gia dinh dưỡng thẩm định lại trước khi dùng cho người dùng thật -
// đúng tinh thần "dietary support tool, không phải nền tảng lâm sàng" đã
// thống nhất trong Overview.
export const CONDITION_NUTRIENT_LIMITS = [
  {
    keywords: ["tiểu đường", "đái tháo đường", "tieu duong"],
    limits: { carb_g: 60 }, // ~1 khẩu phần, ước theo nguyên tắc đếm carb cơ bản
  },
  {
    keywords: ["cao huyết áp", "huyết áp cao", "tăng huyết áp"],
    limits: { sodium_mg: 700 }, // WHO khuyến nghị <2000mg natri/ngày, chia ~3 bữa chính
  },
  {
    keywords: ["suy thận", "thận yếu"],
    limits: { protein_g: 25, potassium_mg: 600, sodium_mg: 500 },
  },
  {
    keywords: ["mỡ máu", "cholesterol", "gan nhiễm mỡ"],
    limits: { cholesterol_mg: 120, fat_g: 25 },
  },
  {
    keywords: ["gout", "gút"],
    limits: {}, // không có dữ liệu purin định lượng - dùng tag purin_cao (dishTagging.js) thay vì ngưỡng số
  },
];

export function matchConditionNutrientLimits(name) {
  const lower = (name || "").toLowerCase();
  const merged = {};
  for (const entry of CONDITION_NUTRIENT_LIMITS) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      for (const [field, max] of Object.entries(entry.limits)) {
        merged[field] = merged[field] !== undefined ? Math.min(merged[field], max) : max;
      }
    }
  }
  return merged;
}

// [2026-09-20] "KHUNG THỰC PHẨM" theo thể trạng - 28 khung (7 mốc calo x 2
// chiến lược macro x 2 hướng), sinh bằng công thức thay vì viết tay từng
// khung (dễ bảo trì, khớp nguyên tắc "ngưỡng cấu hình được, không hardcode"
// trong Decisions_And_Principles). Dùng để chọn tỉ lệ macro mục tiêu khi
// build thực đơn từ bể món ăn (dishPlanLogic.js).
const MACRO_STRATEGIES = {
  balanced: { label: "Cân bằng", protein: 0.2, fat: 0.25, carb: 0.55 },
  high_protein: { label: "Đạm cao", protein: 0.3, fat: 0.25, carb: 0.45 },
};

function buildBodyProfileTemplates() {
  const templates = [];
  const bands = {
    giam_can: [1200, 1300, 1400, 1500, 1600, 1700, 1800],
    tang_can: [1800, 2000, 2200, 2400, 2600, 2800, 3000],
  };
  for (const [direction, kcalBands] of Object.entries(bands)) {
    for (const kcal of kcalBands) {
      for (const [strategyId, strategy] of Object.entries(MACRO_STRATEGIES)) {
        templates.push({
          id: `${direction}_${kcal}_${strategyId}`,
          direction, // "giam_can" | "tang_can"
          kcalBand: kcal,
          macroStrategyId: strategyId,
          label: `${direction === "giam_can" ? "Giảm cân" : "Tăng cân"} ~${kcal}kcal (${strategy.label})`,
          proteinRatio: strategy.protein,
          fatRatio: strategy.fat,
          carbRatio: strategy.carb,
        });
      }
    }
  }
  return templates;
}

export const BODY_PROFILE_TEMPLATES = buildBodyProfileTemplates();

// Chọn khung gần nhất với target calo thực tế + hướng mục tiêu (giam_can vs
// tang_can/tang_co coi như cùng hướng "tang_can" cho mục đích chọn khung).
export function pickBodyProfileTemplate(targetCalories, goalId) {
  const direction = goalId === "giam_can" ? "giam_can" : "tang_can";
  const candidates = BODY_PROFILE_TEMPLATES.filter((t) => t.direction === direction);
  return candidates.reduce((best, t) =>
    Math.abs(t.kcalBand - targetCalories) < Math.abs(best.kcalBand - targetCalories) ? t : best
  );
}

// giam_can / tang_can không có hệ số cố định: calo được suy ra từ số cân người
// dùng muốn đổi và thời gian (xem WEIGHT_CHANGE_RULES). giu_dang / tang_co giữ
// hệ số nhân TDEE.
export const GOALS = [
  {
    id: "giam_can",
    label: "Giảm cân",
    desc: "Thâm hụt calo để giảm mỡ",
  },
  {
    id: "giu_dang",
    label: "Giữ dáng / Duy trì",
    desc: "Giữ nguyên cân nặng hiện tại",
    factor: 1.0,
  },
  {
    id: "tang_can",
    label: "Tăng cân",
    desc: "Thặng dư calo để tăng cân",
  },
  {
    id: "tang_co",
    label: "Tăng cơ",
    desc: "Thặng dư nhẹ, ưu tiên đạm cao",
    factor: 1.12,
  },
];

export const ACTIVITY_LEVELS = [
  {
    id: "it",
    label: "Ít vận động",
    desc: "Ngồi nhiều, ít/không tập luyện",
    factor: 1.2,
  },
  { id: "nhe", label: "Nhẹ", desc: "Tập nhẹ 1–3 ngày/tuần", factor: 1.375 },
  { id: "vua", label: "Vừa phải", desc: "Tập vừa 3–5 ngày/tuần", factor: 1.55 },
  {
    id: "nhieu",
    label: "Nhiều",
    desc: "Tập nặng 6–7 ngày/tuần",
    factor: 1.725,
  },
  {
    id: "rat_nhieu",
    label: "Rất nhiều",
    desc: "Vận động viên / lao động nặng",
    factor: 1.9,
  },
];

export const DURATIONS = [3, 6, 9, 12]; // chỉ theo tháng

// Mục tiêu theo số cân: người dùng chọn số kg muốn giảm/tăng + thời gian, server
// suy ra thâm hụt/thặng dư calo mỗi ngày. Ngưỡng an toàn tham số hoá THEO HƯỚNG
// mục tiêu (giảm vs tăng), không dùng chung một hằng số.
//   direction    : -1 giảm, +1 tăng
//   maxKgPerWeek : tốc độ tối đa cho phép
//   bmiLimit     : BMI cân nặng mục tiêu không được thấp hơn (giảm) / cao hơn (tăng)
//   minCalories  : sàn calo/ngày theo giới tính (chỉ áp dụng khi giảm)
export const WEIGHT_CHANGE_RULES = {
  giam_can: { direction: -1, verb: "giảm", maxKgPerWeek: 1, bmiLimit: 18.5, minCalories: { nam: 1500, nu: 1200 } },
  tang_can: { direction: 1, verb: "tăng", maxKgPerWeek: 0.5, bmiLimit: 25 },
};
export const WEIGHT_CHANGE_KG_RANGE = { min: 1, max: 30 };
export const KCAL_PER_KG = 7700; // ~ năng lượng của 1kg mô cơ thể
export const DAYS_PER_MONTH = 30;

export const MEAL_TYPES = [
  { id: "sang", label: "Sáng", pct: 0.25 },
  { id: "trua", label: "Trưa", pct: 0.35 },
  { id: "toi", label: "Tối", pct: 0.3 },
  { id: "an_vat", label: "Ăn vặt", pct: 0.1 },
];

export const DEFAULT_ADMIN_CONFIG = {
  minIntervalDays: 7,
  thresholdPercent: 2.5,
};

export const FREE_LIMITS = { scan: 5, aiPlan: 5 };

// GIAI ĐOẠN 5 (Premium) — Feedback Loop Engine: mức điều chỉnh calo mỗi
// lần phát hiện tốc độ thay đổi cân nặng không khớp mục tiêu (tài liệu quy
// định 100-150 kcal; chọn điểm giữa), và ngưỡng "chững cân" tính theo kg
// thay đổi trung bình 7 ngày so với 7 ngày liền trước.
export const FEEDBACK_LOOP_CONFIG = { calorieStepKcal: 125, stagnationKg: 0.2 };

export const ADHERENCE_CONFIG = { dayCompletionKcalRatio: 0.8, statsDefaultDays: 30, statsMaxDays: 90 };

export const ADMIN_USER_CONFIG = {
  defaultPageSize: 20,
  maxPageSize: 50,
  maxSearchLen: 100,
  statsDays: 14,
  recentBmiCount: 10,
};

export const EXERCISES = [
  { id: "walking", label: "Đi bộ thong thả", met: 3.5 },
  { id: "brisk_walking", label: "Đi bộ nhanh", met: 4.3 },
  { id: "jogging", label: "Chạy bộ nhẹ", met: 7.0 },
  { id: "running", label: "Chạy bộ nhanh", met: 9.8 },
  { id: "cycling_light", label: "Đạp xe nhẹ", met: 4.0 },
  { id: "cycling_moderate", label: "Đạp xe vừa", met: 8.0 },
  { id: "swimming", label: "Bơi lội", met: 6.0 },
  { id: "strength", label: "Tập tạ / Kháng lực", met: 5.0 },
  { id: "yoga", label: "Yoga", met: 2.5 },
  { id: "jump_rope", label: "Nhảy dây", met: 11.8 },
  { id: "hiit", label: "HIIT đốt mỡ", met: 9.5 },
  { id: "plank", label: "Plank cơ lõi", met: 5.0 },
  { id: "bodyweight_squats", label: "Squat & Lunge", met: 6.0 },
  { id: "pushups", label: "Hít đất", met: 5.8 },
  { id: "stretching", label: "Giãn cơ phục hồi", met: 2.8 },
  { id: "aerobics", label: "Thể dục nhịp điệu", met: 4.0 },
  { id: "deadbug", label: "Deadbug & Cầu mông", met: 4.2 },
];

export const EXERCISE_LIMITS = { minMinutes: 1, maxMinutesPerEntry: 300 };
