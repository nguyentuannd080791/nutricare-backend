// Định nghĩa 15 Kịch bản bữa ăn (Meal Scenarios) theo nhóm thể trạng và mục tiêu.
// Giải quyết dứt điểm:
// 1. Thiếu chất xơ / rau củ
// 2. Format overlap (quá nhiều món nước/bún/phở trong ngày)
// 3. Đưa đồ ăn vặt/uống vào bữa chính
// 4. Bắt buộc có tinh bột chính (STAPLE_CARB: cơm/khoai) trong mâm cơm
// 5. Bộ lọc toàn diện cho giảm cân (isDeepFried, isHighSugar, isOrganMeat, isHeavySoup)

export const MEAL_ROLES = {
  STAPLE_CARB: { id: "STAPLE_CARB", label: "Tinh bột chính (Cơm / Khoai)" },
  MAIN_PROTEIN: { id: "MAIN_PROTEIN", label: "Món đạm chính" },
  SIDE_PROTEIN: { id: "SIDE_PROTEIN", label: "Món đạm phụ" },
  VEG: { id: "VEG", label: "Rau củ / Xơ" },
  SOUP: { id: "SOUP", label: "Món canh" },
  NOODLE_MAIN: { id: "NOODLE_MAIN", label: "Món nước / Bún / Phở" },
  NOODLE_SIDE: { id: "NOODLE_SIDE", label: "Món ăn kèm" },
  SALAD_BOWL: { id: "SALAD_BOWL", label: "Tô salad tổng hợp" },
  ROLLS: { id: "ROLLS", label: "Món cuốn" },
  DESSERT: { id: "DESSERT", label: "Tráng miệng / Bữa phụ" },
  DRINK: { id: "DRINK", label: "Đồ uống / Trái cây" },
  SNACK: { id: "SNACK", label: "Món ăn nhẹ" },
};

export const MEAL_SCENARIOS = [
  // ==========================================
  // NHÓM I: DUY TRÌ / BÌNH THƯỜNG (giu_dang, can_bang)
  // ==========================================
  {
    id: "SCENARIO_1",
    label: "Mâm cơm gia đình truyền thống (Cơm + Đạm + Rau + Canh)",
    description: "Cơm tẻ/khoai + Đạm chính luộc/kho/nướng + Rau xào/luộc + Canh tốn cơm",
    goals: ["giu_dang", "can_bang"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_2",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Cơm / Tinh bột chính",
        formats: ["STAPLE_CARB"],
        tolerance: [0.25, 0.40],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Món đạm chính",
        formats: ["BRAISED_SIMMERED", "GRILLED_ROASTED", "BOILED_MEAT", "DEEP_FRIED"],
        tolerance: [0.35, 0.50],
      },
      {
        role: "VEG",
        label: "Món rau xơ thanh mát",
        formats: ["STIR_FRIED_VEG", "BOILED_VEG", "SALAD_GOI"],
        tolerance: [0.10, 0.20],
      },
      {
        role: "SOUP",
        label: "Canh tốn cơm",
        formats: ["LIGHT_SOUP", "HEAVY_SOUP"],
        tolerance: [0.10, 0.20],
      },
    ],
  },
  {
    id: "SCENARIO_2",
    label: "Bữa ăn nhanh gọn nhẹ (Cơm + Món xào thập cẩm + Canh)",
    description: "Cơm tẻ + Món xào thập cẩm thịt rau củ + Canh nấu nhanh",
    goals: ["giu_dang", "can_bang"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_3",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Cơm / Tinh bột chính",
        formats: ["STAPLE_CARB"],
        tolerance: [0.30, 0.45],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Món xào thập cẩm đậm đà",
        formats: ["STIR_FRIED_MEAT"],
        tolerance: [0.35, 0.50],
      },
      {
        role: "SOUP",
        label: "Canh nấu nhanh",
        formats: ["LIGHT_SOUP"],
        tolerance: [0.15, 0.25],
      },
    ],
  },
  {
    id: "SCENARIO_3",
    label: "Đổi gió món nước truyền thống (Bún/Phở + Rau gỏi ăn kèm)",
    description: "Phở/Bún/Miến có nước dùng + Món ăn kèm rau/gỏi/cuốn",
    goals: ["giu_dang", "can_bang"],
    slotsAllowed: ["trua", "toi"],
    isNoodleFormat: true,
    fallbackId: "SCENARIO_1",
    slots: [
      {
        role: "NOODLE_MAIN",
        label: "Món nước trứ danh",
        formats: ["SOUP_NOODLE"],
        tolerance: [0.70, 0.85],
      },
      {
        role: "NOODLE_SIDE",
        label: "Món ăn kèm thanh mát",
        formats: ["SALAD_GOI", "BOILED_VEG", "ROLLS_WRAPS"],
        tolerance: [0.15, 0.30],
      },
    ],
  },
  {
    id: "SCENARIO_4",
    label: "Tiệc tùng / Đổi vị tại gia (4 món)",
    description: "Gỏi khai vị + Món nướng + Món chiên + Canh chua / Lẩu",
    goals: ["giu_dang", "can_bang"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_1",
    slots: [
      {
        role: "VEG",
        label: "Món khai vị thanh nhẹ",
        formats: ["SALAD_GOI"],
        tolerance: [0.10, 0.20],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Món nướng đậm đà",
        formats: ["GRILLED_ROASTED"],
        tolerance: [0.30, 0.45],
      },
      {
        role: "SIDE_PROTEIN",
        label: "Món chiên rán giòn",
        formats: ["DEEP_FRIED"],
        tolerance: [0.20, 0.35],
      },
      {
        role: "SOUP",
        label: "Canh chua / Lẩu chốt hạ",
        formats: ["LIGHT_SOUP", "HEAVY_SOUP", "HOTPOT"],
        tolerance: [0.15, 0.25],
      },
    ],
  },
  {
    id: "SCENARIO_5",
    label: "Bữa sáng dinh dưỡng & năng lượng",
    description: "Món khô/cuốn/nước chắc bụng + Thức uống nhẹ / hoa quả",
    goals: ["giu_dang", "can_bang", "giam_can", "tang_can", "tang_co"],
    slotsAllowed: ["sang"],
    fallbackId: null,
    slots: [
      {
        role: "MAIN_PROTEIN",
        label: "Món ăn sáng chắc bụng",
        formats: ["SOUP_NOODLE", "DRY_NOODLE", "BREAD_BURGER", "WRAPPED_CAKE_CHA_NEM", "RICE_PORRIDGE_STICKY", "STAPLE_CARB"],
        tolerance: [0.70, 0.90],
      },
      {
        role: "DRINK",
        label: "Thức uống / Trái cây bổ sung",
        formats: ["BEVERAGE", "FRUIT_RAW"],
        tolerance: [0.10, 0.30],
      },
    ],
  },

  // ==========================================
  // NHÓM II: NGƯỜI THỪA CÂN (giam_can - Low Calorie, giàu xơ, không béo/đường)
  // ==========================================
  {
    id: "SCENARIO_6",
    label: "Mâm cơm giảm cân đạm nạc (Cơm/Khoai + Thịt nạc/Cá hấp + Rau luộc + Canh)",
    description: "Tinh bột chậm (Khoai/Cơm lưng bát) + Protein nạc hấp/luộc + Rau luộc chặn đói + Canh rau trong",
    goals: ["giam_can"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_8",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Khoai lang / Cơm tẻ lưng bát",
        formats: ["STAPLE_CARB"],
        tolerance: [0.20, 0.35],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Protein nạc (Cá kho/nướng nạc, Thịt nạc, Gà luộc/hấp)",
        formats: ["BOILED_MEAT", "BRAISED_SIMMERED", "GRILLED_ROASTED"],
        tolerance: [0.35, 0.50],
      },
      {
        role: "VEG",
        label: "Chặn đói bằng rau củ luộc",
        formats: ["BOILED_VEG"],
        tolerance: [0.15, 0.30],
      },
      {
        role: "SOUP",
        label: "Canh rau thanh lọc (ít béo)",
        formats: ["LIGHT_SOUP"],
        tolerance: [0.10, 0.20],
      },
    ],
  },
  {
    id: "SCENARIO_7",
    label: "Bữa ăn Eat Clean / Salad Bowl (1 món gộp)",
    description: "Tô salad tổng hợp thịt nạc, trứng, rau quả tươi",
    goals: ["giam_can"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_6",
    slots: [
      {
        role: "SALAD_BOWL",
        label: "Tô salad Eat Clean tổng hợp",
        formats: ["SALAD_GOI"],
        tolerance: [0.85, 1.0],
      },
    ],
  },
  {
    id: "SCENARIO_8",
    label: "Đổi vị món khô / bún trộn ít béo (2 món)",
    description: "Miến/Bún trộn thanh đạm + Rau củ luộc ăn kèm bổ sung xơ",
    goals: ["giam_can"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_6",
    slots: [
      {
        role: "MAIN_PROTEIN",
        label: "Bún / Miến trộn thanh đạm",
        formats: ["DRY_NOODLE"],
        tolerance: [0.65, 0.85],
      },
      {
        role: "VEG",
        label: "Rau củ luộc bổ sung chất xơ",
        formats: ["BOILED_VEG"],
        tolerance: [0.15, 0.35],
      },
    ],
  },
  {
    id: "SCENARIO_9",
    label: "Món cuốn tươi mát & hoa quả (2 món)",
    description: "Món cuốn nhiều rau nạc + Trái cây tươi ít ngọt",
    goals: ["giam_can"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_6",
    slots: [
      {
        role: "ROLLS",
        label: "Món cuốn nhiều rau",
        formats: ["ROLLS_WRAPS"],
        tolerance: [0.65, 0.85],
      },
      {
        role: "DRINK",
        label: "Hoa quả tươi ít ngọt",
        formats: ["FRUIT_RAW"],
        tolerance: [0.15, 0.35],
      },
    ],
  },
  {
    id: "SCENARIO_10",
    label: "Bữa tối nửa bụng thanh nhẹ (2 món)",
    description: "Canh rau củ trong ăn vã + Gỏi nộm chua ngọt nhẹ",
    goals: ["giam_can"],
    slotsAllowed: ["toi"],
    fallbackId: "SCENARIO_6",
    slots: [
      {
        role: "SOUP",
        label: "Canh thập cẩm đặc ruột",
        formats: ["LIGHT_SOUP"],
        tolerance: [0.45, 0.60],
      },
      {
        role: "VEG",
        label: "Món gỏi nhẹ nhàng giải ngấy",
        formats: ["SALAD_GOI"],
        tolerance: [0.40, 0.55],
      },
    ],
  },

  // ==========================================
  // NHÓM III: NGƯỜI THIẾU CÂN (tang_can, tang_co - High Calorie, nạp đạm)
  // ==========================================
  {
    id: "SCENARIO_11",
    label: "Mâm cơm Vua dồi dào năng lượng (Cơm + Đạm chính + Đạm phụ + Rau + Canh)",
    description: "Cơm tẻ miệng bát/xôi + Đạm chính đậm đà + Đạm phụ chiên giòn + Rau xào béo + Canh xương hầm",
    goals: ["tang_can", "tang_co"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_12",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Cơm tẻ / Xôi nạp năng lượng",
        formats: ["STAPLE_CARB", "RICE_PORRIDGE_STICKY"],
        tolerance: [0.25, 0.35],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Món đạm chính đậm đà",
        formats: ["BRAISED_SIMMERED", "GRILLED_ROASTED"],
        tolerance: [0.30, 0.45],
      },
      {
        role: "SIDE_PROTEIN",
        label: "Món đạm phụ chiên giòn",
        formats: ["DEEP_FRIED"],
        tolerance: [0.15, 0.25],
      },
      {
        role: "VEG",
        label: "Rau củ xào bóng ngậy",
        formats: ["STIR_FRIED_VEG"],
        tolerance: [0.10, 0.20],
      },
      {
        role: "SOUP",
        label: "Canh xương hầm đặc",
        formats: ["HEAVY_SOUP", "LIGHT_SOUP"],
        tolerance: [0.10, 0.20],
      },
    ],
  },
  {
    id: "SCENARIO_12",
    label: "Bữa ăn nạp đạm cực đại (Cơm + Thịt xào + Đồ chiên + Canh)",
    description: "Cơm tẻ + Thịt xào đẫm sốt + Đồ chiên giòn rụm + Canh chua đưa cơm",
    goals: ["tang_can", "tang_co"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_1",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Cơm tẻ chắc bụng",
        formats: ["STAPLE_CARB"],
        tolerance: [0.25, 0.35],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Thịt xào đẫm sốt",
        formats: ["STIR_FRIED_MEAT"],
        tolerance: [0.35, 0.45],
      },
      {
        role: "SIDE_PROTEIN",
        label: "Đồ chiên giòn rụm",
        formats: ["DEEP_FRIED"],
        tolerance: [0.15, 0.25],
      },
      {
        role: "SOUP",
        label: "Canh kích thích vị giác",
        formats: ["LIGHT_SOUP", "HEAVY_SOUP"],
        tolerance: [0.10, 0.20],
      },
    ],
  },
  {
    id: "SCENARIO_13",
    label: "Bữa phụ giàu năng lượng (2 món)",
    description: "Đồ ngọt bổ dưỡng + Sữa/Nước ép đậm đặc",
    goals: ["tang_can", "tang_co"],
    slotsAllowed: ["an_vat"],
    fallbackId: null,
    slots: [
      {
        role: "DESSERT",
        label: "Món ngọt dồi dào năng lượng",
        formats: ["DESSERT_SWEET"],
        tolerance: [0.60, 0.80],
      },
      {
        role: "DRINK",
        label: "Sữa hoặc sinh tố béo",
        formats: ["BEVERAGE"],
        tolerance: [0.20, 0.40],
      },
    ],
  },
  {
    id: "SCENARIO_14",
    label: "Đổi gió cuối tuần nặng đô (2 món)",
    description: "Món nước hầm xương đặc biệt + Đồ ăn kèm giòn ngậy",
    goals: ["tang_can", "tang_co"],
    slotsAllowed: ["trua", "toi"],
    isNoodleFormat: true,
    fallbackId: "SCENARIO_12",
    slots: [
      {
        role: "NOODLE_MAIN",
        label: "Món nước hầm xương đậm vị",
        formats: ["SOUP_NOODLE"],
        tolerance: [0.70, 0.85],
      },
      {
        role: "NOODLE_SIDE",
        label: "Món ăn kèm chiên ngậy",
        formats: ["DEEP_FRIED", "WRAPPED_CAKE_CHA_NEM"],
        tolerance: [0.15, 0.30],
      },
    ],
  },
  {
    id: "SCENARIO_15",
    label: "Đại tiệc đồ nướng giải ngấy (Cơm/Bánh + Thịt nướng + Gỏi)",
    description: "Cơm nắm/bánh cuốn + Thịt nướng thơm lừng + Gỏi chua ngọt giải ngấy",
    goals: ["tang_can", "tang_co"],
    slotsAllowed: ["trua", "toi"],
    fallbackId: "SCENARIO_12",
    slots: [
      {
        role: "STAPLE_CARB",
        label: "Cơm nắm / Bánh cuốn ăn kèm",
        formats: ["STAPLE_CARB", "WRAPPED_CAKE_CHA_NEM"],
        tolerance: [0.20, 0.35],
      },
      {
        role: "MAIN_PROTEIN",
        label: "Món thịt nướng thơm lừng",
        formats: ["GRILLED_ROASTED"],
        tolerance: [0.45, 0.60],
      },
      {
        role: "VEG",
        label: "Gỏi / Nộm giải ngấy",
        formats: ["SALAD_GOI"],
        tolerance: [0.15, 0.25],
      },
    ],
  },

  // ==========================================
  // KỊCH BẢN RIÊNG CHO ĂN VẶT
  // ==========================================
  {
    id: "SCENARIO_SNACK_LIGHT",
    label: "Ăn vặt thanh nhẹ (Trái cây / Thức uống)",
    description: "Trái cây tươi hoặc đồ uống không đường",
    goals: ["giam_can", "giu_dang", "can_bang"],
    slotsAllowed: ["an_vat"],
    fallbackId: null,
    slots: [
      {
        role: "SNACK",
        label: "Trái cây / Đồ uống nhẹ",
        formats: ["FRUIT_RAW", "BEVERAGE"],
        tolerance: [0.80, 1.0],
      },
    ],
  },
  {
    id: "SCENARIO_SNACK_FLEX",
    label: "Ăn nhẹ xế chiều",
    description: "Tráng miệng hoặc món ăn vặt nhẹ",
    goals: ["giu_dang", "can_bang", "tang_can", "tang_co"],
    slotsAllowed: ["an_vat"],
    fallbackId: null,
    slots: [
      {
        role: "SNACK",
        label: "Món ăn vặt / Bánh ngọt",
        formats: ["DESSERT_SWEET", "PACKAGED_SNACK", "FRUIT_RAW", "BEVERAGE", "ROLLS_WRAPS"],
        tolerance: [0.80, 1.0],
      },
    ],
  },
];

// Helper phân loại chi tiết món ăn từ dữ liệu gốc
export function refineDishFormat(dish) {
  const name = (dish.nameVi || "").toLowerCase();
  const rawFormat = dish.dishFormat;
  let refinedFormat = rawFormat;
  let isHeavySoup = false;
  let isDeepFried = false;
  let isHighSugar = false;
  let isOrganMeat = false;
  let isSnackOrBarFood = false;
  let isHighSugarFruit = false;
  let isNightHeavyCarb = false;
  let isFastFood = false;

  // 1. Phân loại nguồn đạm (proteinSource)
  let proteinSource = "OTHER";
  if (/ốc|ngao|sò|hàu|cua|ghẹ|mực|bạch tuộc|tôm|trai|hến|don|vẹm/.test(name)) {
    proteinSource = "SHELLFISH";
  } else if (/gà|vịt|ngan/.test(name) && !/chân gà/.test(name)) {
    proteinSource = "POULTRY";
  } else if (/cá |cá quả|cá lóc|cá thu|cá ngừ|cá rô|cá bống|cá trắm|cá trê|cá diếc|cá nục|cá chày|chả cá/.test(name)) {
    proteinSource = "FISH";
  } else if (/thịt lợn|thịt heo|thịt bò|bò |bê |thịt thăn|thịt nạc|thịt bắp/.test(name)) {
    proteinSource = "PORK_BEEF";
  } else if (/đậu phụ|đậu hũ|đậu triều|nấm/.test(name)) {
    proteinSource = "PLANT";
  }

  // 2. Món nhậu / ăn vặt quán xá (không làm đạm chính bữa cơm gia đình)
  if (/chân gà|cánh gà|tai heo|dồi sụn|hạt dẻ|bánh tráng|quẩy|bò bía|phá lấu|ốc hút|ốc xào cay|trứng vịt lộn|trứng lộn|bánh đúc/.test(name)) {
    isSnackOrBarFood = true;
  }

  // 3. Fast Food (Hamburger, Burger, Pizza)
  if (rawFormat === "BREAD_BURGER" || /hamburger|burger|pizza/.test(name)) {
    isFastFood = true;
  }

  // 4. Trái cây ngọt đậm / chỉ số đường huyết cao
  if (/mít|vải thiều|vải|sầu riêng|nhãn|xoài chín/.test(name)) {
    isHighSugarFruit = true;
  }

  // 5. Tinh bột củ gây đầy bụng ban đêm
  if (/sắn luộc|củ dong|củ từ/.test(name)) {
    isNightHeavyCarb = true;
  }

  // 6. Phát hiện Nội tạng (Organ meat)
  if (/lòng|phá lấu|tim|cật|gan|óc|tiết|dồi|lưỡi|nội tạng|mề/.test(name)) {
    isOrganMeat = true;
  }

  // 7. Phát hiện đồ ngọt đường cao (High Sugar / Free Sugar / Sữa công nghiệp ngọt)
  if (
    /sữa ngô|sữa milo|milo|váng sữa|monte|nước mía|sữa đặc|chè|caramen|kem|đường|mật|siro|bánh quy|bánh ngọt|thạch|trà sữa|nước dừa|nước ép nho/.test(
      name
    ) ||
    rawFormat === "DESSERT_SWEET"
  ) {
    isHighSugar = true;
  }

  // 8. Phát hiện chiên rán ngập dầu (Deep Fried)
  if (
    rawFormat === "FRIED_RANG" ||
    /chiên|rán|quay giòn|cháy cạnh|tẩm bột|sườn xào chua ngọt|khoai tây chiên|khoai lang chiên|gà rán|nem rán|nem chua rán/.test(name)
  ) {
    isDeepFried = true;
  }

  // 9. Phát hiện đồ ăn vặt / Street food snack / Đồ ngọt chiên
  const isSnack =
    /bánh tráng|bánh xiên|quẩy đường|bánh quẩy|quẩy rán|^quẩy|bánh đúc|bánh gối|phô mai que|phô mai chiên|khoai tây chiên|khoai lang kén|bánh chuối chiên|bánh chuối|bánh khoai|bánh tiêu|bánh cam|bánh cay|bò bía|kẹo|bim bim|ô mai|bánh chưng rán|hạt dẻ/.test(
      name
    );

  if (isSnack) {
    refinedFormat = /ngọt|đường|mật|chè/.test(name) ? "DESSERT_SWEET" : "PACKAGED_SNACK";
    return {
      refinedFormat,
      proteinSource,
      isHeavySoup: false,
      isDeepFried,
      isHighSugar,
      isOrganMeat,
      isSnackOrBarFood: true,
      isHighSugarFruit,
      isNightHeavyCarb,
      isFastFood,
    };
  }

  // 10. Tinh bột chính (STAPLE_CARB): cơm tẻ, cơm nắm, khoai lang luộc, ngô luộc...
  const isStapleCarb =
    /cơm tẻ|cơm trắng|cơm nắm|cơm gạo|khoai lang luộc|ngô luộc|sắn luộc|củ từ luộc|củ dong luộc|cơm lứt|bát cơm|cơm tám/.test(name);
  if (isStapleCarb) {
    refinedFormat = "STAPLE_CARB";
    return {
      refinedFormat,
      proteinSource,
      isHeavySoup: false,
      isDeepFried: false,
      isHighSugar: false,
      isOrganMeat: false,
      isSnackOrBarFood: false,
      isHighSugarFruit,
      isNightHeavyCarb,
      isFastFood: false,
    };
  }

  // 11. Canh
  if (rawFormat === "SOUP_SIDE") {
    const isHeavyKw = /sườn|xương|chân giò|móng giò|bung|cá mè|cá chép|thịt chó|đuôi bò|gầu/.test(name);
    if (isHeavyKw || (dish.kcal && dish.kcal >= 250) || (dish.fatG && dish.fatG >= 15)) {
      refinedFormat = "HEAVY_SOUP";
      isHeavySoup = true;
    } else {
      refinedFormat = "LIGHT_SOUP";
      isHeavySoup = false;
    }
  } else if (rawFormat === "BOILED_STEAMED") {
    const hasMeat = /thịt|gà|vịt|lợn|heo|bò|cá|lòng|tiết|lưỡi|đuôi|trứng|ốc|ngao|hải sản|bê/.test(name);
    const hasVeg = /rau|cải|bắp cải|su hào|củ|đỗ|đậu|ngô|bí|mướp|giền|dền|ngót|muống|khoai|sắn|nấm/.test(name);
    if (hasVeg && !hasMeat) {
      refinedFormat = "BOILED_VEG";
    } else {
      refinedFormat = "BOILED_MEAT";
    }
  } else if (rawFormat === "STIR_FRY") {
    const hasMeat = /thịt|bò|bê|mực|tép|ốc|lợn|heo|gà|vịt|ngao|hải sản|tim|cật|lòng/.test(name);
    const hasVeg = /rau|cải|bí|su su|giá|ngồng|măng|muống|mướp|nấm|hành tây|ngô|đậu|đỗ/.test(name);
    if (hasVeg && !hasMeat) {
      refinedFormat = "STIR_FRIED_VEG";
    } else {
      refinedFormat = "STIR_FRIED_MEAT";
    }
  } else if (rawFormat === "SALAD_MIX") {
    refinedFormat = "SALAD_GOI";
  } else if (rawFormat === "FRIED_RANG") {
    if (/ngọt|đường|mật/.test(name)) {
      refinedFormat = "DESSERT_SWEET";
      isHighSugar = true;
    } else {
      refinedFormat = "DEEP_FRIED";
      isDeepFried = true;
    }
  } else if (rawFormat === "GRILLED") {
    refinedFormat = "GRILLED_ROASTED";
  } else if (rawFormat === "BRAISED_STEWED") {
    refinedFormat = "BRAISED_SIMMERED";
  } else if (rawFormat === "WRAPPED_CAKE_CHA_NEM") {
    if (/cuốn|phở cuốn|gỏi cuốn/.test(name)) {
      refinedFormat = "ROLLS_WRAPS";
    } else if (/nem|chả/.test(name)) {
      refinedFormat = "DEEP_FRIED";
      isDeepFried = true;
    }
  }

  return {
    refinedFormat,
    proteinSource,
    isHeavySoup,
    isDeepFried,
    isHighSugar,
    isOrganMeat,
    isSnackOrBarFood,
    isHighSugarFruit,
    isNightHeavyCarb,
    isFastFood,
  };
}

// Lấy danh sách kịch bản phù hợp với mục tiêu và slot
export function getScenariosForGoal(goalId, mealSlotId) {
  const normGoal = goalId === "tang_co" ? "tang_co" : (goalId === "tang_can" ? "tang_can" : (goalId === "giam_can" ? "giam_can" : "giu_dang"));
  return MEAL_SCENARIOS.filter((sc) => {
    if (!sc.slotsAllowed.includes(mealSlotId)) return false;
    return sc.goals.includes(normGoal) || sc.goals.includes("giu_dang") || sc.goals.includes("can_bang");
  });
}

export function getScenarioById(scenarioId) {
  return MEAL_SCENARIOS.find((s) => s.id === scenarioId) || null;
}

export function getFallbackScenario(scenarioId) {
  const current = getScenarioById(scenarioId);
  if (!current || !current.fallbackId) return null;
  return getScenarioById(current.fallbackId);
}
