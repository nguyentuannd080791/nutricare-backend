/**
 * Medical Rules & Constraints Engine
 * Chuẩn hóa bộ quy tắc y khoa cho các bệnh lý và rối loạn chuyển hóa.
 */

export const MEDICAL_CONDITIONS = {
  GOUT: 'GOUT',
  DIABETES: 'DIABETES',
  CKD: 'CKD', // Suy thận mạn
  G6PD: 'G6PD',
  HFI: 'HFI', // Hereditary Fructose Intolerance
  PKU: 'PKU', // Phenylketonuria
  GALACTOSEMIA: 'GALACTOSEMIA',
  ALPHA_GAL: 'ALPHA_GAL',
  HYPOTHYROIDISM: 'HYPOTHYROIDISM', // Suy giáp/Hashimoto
  GERD: 'GERD',
  ASTHMA_SULFITE: 'ASTHMA_SULFITE',
  // [2026-09-21] Bổ sung theo Bệnh_lý_và_thực_phẩm_hạn_chế.txt - các mục
  // 4.2-4.4, 5.1, 5.3 trước đây chưa có trong enum.
  OAS_PFAS: 'OAS_PFAS', // Hội chứng dị ứng miệng / dị ứng phấn hoa-thực phẩm
  EOE: 'EOE', // Viêm thực quản tăng bạch cầu ái toan
  FPIES: 'FPIES', // Viêm ruột do protein thực phẩm (trẻ nhỏ)
  MCAS_HISTAMINE: 'MCAS_HISTAMINE', // Hoạt hoá tế bào Mast / bất dung nạp histamine
  MAOI_TYRAMINE: 'MAOI_TYRAMINE', // Đang dùng thuốc chống trầm cảm MAOI
  STATIN_GRAPEFRUIT: 'STATIN_GRAPEFRUIT', // Đang dùng statin hạ mỡ máu
};

export const HARD_BAN_KEYWORDS = {
  [MEDICAL_CONDITIONS.GOUT]: [
    'gan', 'thận', 'tim', 'óc', 'lòng', 'dạ dày', 'bao tử', 'nội tạng',
    'thịt bò', 'thịt chó', 'thịt cừu', 'thịt dê', 'thịt ngỗng', 'thịt gà tây',
    'cá mòi', 'cá trích', 'cá ngừ đóng hộp', 'cá thu', 'tôm', 'cua', 'nghêu', 'sò', 'ốc',
    'bia', 'rượu', 'nước ngọt', 'siro ngô', 'mật ong', 'lạp xưởng', 'xúc xích', 'thịt xông khói'
  ],
  [MEDICAL_CONDITIONS.DIABETES]: [
    // [2026-09-21] Bổ sung nhóm "tinh bột tinh chế" - mục ĐẦU TIÊN trong tài
    // liệu bệnh tiểu đường nhưng bị thiếu trong bản gốc. LƯU Ý: đây là nhóm
    // rất rộng (cơm/bún/phở/mì chiếm phần lớn catalog món Việt) - tài liệu
    // gốc dùng giọng "hạn chế" chứ không phải "chống chỉ định tuyệt đối" như
    // G6PD/PKU/Galactosemia. Cân nhắc: cấm cứng nhóm này có thể loại gần hết
    // bể 1247 món cho người tiểu đường, có thể bạn muốn xử lý bằng ngưỡng
    // carb_g (đã có sẵn CONDITION_NUTRIENT_LIMITS.tiểu đường → carb_g: 60 ở
    // constants.js) thay vì cấm cứng theo tên — đang để cả 2 cùng áp dụng,
    // bạn kiểm tra xem có quá chặt không.
    'đường tinh luyện', 'bánh kẹo', 'nước ngọt', 'trà sữa', 'siro', 'mứt',
    'trái cây sấy', 'nho khô', 'chà là', 'mít sấy', 'nước ép đóng hộp',
    'thịt lợn mỡ', 'da gà', 'da vịt', 'thức ăn nhanh', 'pizza', 'hamburger',
    'rượu', 'bia',
  ],
  [MEDICAL_CONDITIONS.CKD]: [
    'quả khế', 'khế', 'dưa muối', 'cà muối', 'mắm tôm', 'cá khô', 'thịt xông khói',
    'nước tương', 'nội tạng', 'óc', 'lòng đỏ trứng'
  ],
  [MEDICAL_CONDITIONS.G6PD]: [
    'đậu dâu tằm', 'đậu răng ngựa', 'fava', 'đậu nành', 'đậu tương', 'đậu đen',
    'đậu xanh', 'đậu đỏ', 'đậu phộng', 'đậu hà lan', 'mướp đắng', 'khổ qua', 'việt quất', 'nước tonic'
  ],
  [MEDICAL_CONDITIONS.HFI]: [
    'táo', 'lê', 'dưa hấu', 'xoài', 'nho', 'anh đào', 'trái cây sấy', 'mật ong',
    'siro ngô', 'đường mía', 'đường trắng', 'đường nâu', 'sorbitol', 'kẹo cao su', 'tương cà'
  ],
  [MEDICAL_CONDITIONS.PKU]: [
    'thịt bò', 'thịt lợn', 'thịt gà', 'hải sản', 'trứng', 'sữa bò', 'phô mai', 'sữa chua',
    'đậu nành', 'đậu phụ', 'hạnh nhân', 'óc chó', 'bơ đậu phộng', 'yến mạch', 'aspartame'
  ],
  [MEDICAL_CONDITIONS.GALACTOSEMIA]: [
    'sữa bò', 'sữa dê', 'sữa cừu', 'phô mai', 'sữa chua', 'bơ', 'kem', 'váng sữa', 'casein', 'whey'
  ],
  [MEDICAL_CONDITIONS.ALPHA_GAL]: [
    'thịt bò', 'thịt lợn', 'thịt heo', 'thịt cừu', 'thịt nai', 'thịt thỏ', 'mỡ lợn', 'gelatin'
  ],
  [MEDICAL_CONDITIONS.HYPOTHYROIDISM]: [
    'bắp cải sống', 'súp lơ sống', 'cải bẹ sống', 'bông cải xanh sống', 'đậu phụ non', 'sữa đậu nành', 'aspartame'
  ],
  // [2026-09-21] Bổ sung - trước đây có trong MEDICAL_CONDITIONS nhưng
  // danh sách từ khoá bị bỏ trống, nên khai báo bệnh này KHÔNG cấm được
  // món nào cả (kể cả sau khi wiring được sửa).
  [MEDICAL_CONDITIONS.GERD]: [
    'chiên', 'rán', 'cay', 'ớt', 'bạc hà', 'socola', 'cà phê', 'rượu', 'bia', 'cam', 'chanh', 'bưởi',
  ],
  [MEDICAL_CONDITIONS.ASTHMA_SULFITE]: [
    'trái cây sấy', 'mơ sấy', 'nho sấy', 'rượu vang', 'bia', 'giấm', 'khoai tây chế biến',
    'phẩm màu', 'mì chính', 'bột ngọt', 'natri benzoat',
  ],
  // Mục 4.2 - danh sách rất dài, tổng hợp cả 4 nhóm dị nguyên chéo (phấn hoa
  // bạch dương/cỏ/cỏ dại + hội chứng mủ cao su) vào 1 danh sách duy nhất vì
  // hệ thống hiện không phân biệt được loại phấn hoa cụ thể của từng người
  // dùng - nếu cần chính xác hơn, nên tách theo sub-condition riêng sau.
  [MEDICAL_CONDITIONS.OAS_PFAS]: [
    'táo', 'lê', 'đào', 'mận', 'anh đào', 'dâu tây', 'kiwi', 'cà rốt sống', 'cần tây sống',
    'hạt phỉ', 'hạnh nhân', 'óc chó', 'đậu nành', 'cà chua sống', 'dưa lưới', 'dưa hấu',
    'cam', 'khoai tây sống', 'đậu phộng', 'chuối', 'dưa chuột', 'dưa leo', 'bí xanh',
    'hạt hướng dương', 'ớt chuông', 'bơ', 'hạt dẻ', 'đu đủ',
  ],
  [MEDICAL_CONDITIONS.EOE]: [
    'sữa', 'phô mai', 'sữa chua', 'bơ', 'kem', 'whey', 'lúa mì', 'bột mì', 'lúa mạch',
    'nước tương', 'bánh mì', 'mì ống', 'trứng', 'mayonnaise', 'đậu nành', 'sữa đậu nành',
    'edamame', 'lạc', 'đậu phộng', 'hạnh nhân', 'óc chó', 'hạt điều', 'hạt dẻ cười',
    'tôm', 'cua', 'nghêu', 'sò', 'mực', 'cá',
  ],
  [MEDICAL_CONDITIONS.FPIES]: [
    'sữa bò', 'đậu nành', 'gạo', 'yến mạch', 'bơ', 'khoai tây', 'khoai lang', 'bí đỏ', 'đậu xanh',
  ],
  [MEDICAL_CONDITIONS.MCAS_HISTAMINE]: [
    'dưa muối', 'kim chi', 'nước tương', 'tempeh', 'phô mai', 'rượu vang', 'giấm',
    'xúc xích', 'thịt xông khói', 'cá ngừ đóng hộp', 'cá thu', 'bơ', 'rau chân vịt',
    'cà tím', 'cà chua', 'dâu tây', 'dứa', 'socola', 'óc chó',
  ],
  [MEDICAL_CONDITIONS.MAOI_TYRAMINE]: [
    'phô mai', 'thịt ủ chua', 'salami', 'pepperoni', 'nước tương', 'rượu vang', 'bia', 'nội tạng',
  ],
  [MEDICAL_CONDITIONS.STATIN_GRAPEFRUIT]: [
    'bưởi chùm', 'nước ép bưởi',
  ],
};

export const CKD_NUTRIENT_LIMITS = {
  SODIUM_MG_MAX: 2000,
  POTASSIUM_MG_MIN: 1000,
  POTASSIUM_MG_MAX: 3000,
  PHOSPHORUS_MG_MAX: 1200, // CHƯA DÙNG ĐƯỢC: catalog hiện không có field phosphorus - xem ghi chú ở đáy file
};

// [2026-09-21] SỬA LỖI KHỚP TỪ: so khớp bằng .includes() thô sẽ dính "gan"
// (cấm cho gút/thận/tuyến giáp) vào "Miến ngan"/"Bún ngan" (ngan = 1 loại
// vịt, không liên quan) vì "gan" là substring của "ngan". Bọc cả tên món và
// từ khoá trong khoảng trắng rồi so " keyword " để bắt buộc khớp theo RANH
// GIỚI TỪ, không phải theo chuỗi ký tự con. Dấu phẩy trong tên món (vd "Canh
// đậu, thịt, cà chua") cũng được đổi thành khoảng trắng trước khi bọc, để
// không làm mất ranh giới ở đó.
function wordBoundaryIncludes(haystack, needle) {
  const pad = (s) => ` ${s.replace(/[,.;]/g, " ")} `;
  return pad(haystack).includes(pad(needle));
}

/**
 * Kiểm tra món ăn hoặc thực phẩm có vi phạm điều kiện cấm của bệnh lý hay không.
 * @param {Object} item - Dish hoặc RawFood object
 * @param {Array<string>} userConditions - Danh sách bệnh lý người dùng mắc phải
 * @returns {Object} { isBanned: boolean, reason: string | null }
 */
export function validateItemMedicalRules(item, userConditions = []) {
  if (!userConditions || userConditions.length === 0) {
    return { isBanned: false, reason: null };
  }

  const nameCheckStr = ((item.nameVi || '') + ' ' + (item.nameEn || '') + ' ' + JSON.stringify(item.searchAliases || '')).toLowerCase();

  for (const condition of userConditions) {
    const bannedKeywords = HARD_BAN_KEYWORDS[condition] || [];
    for (const kw of bannedKeywords) {
      if (wordBoundaryIncludes(nameCheckStr, kw.toLowerCase())) {
        return {
          isBanned: true,
          reason: `Vi phạm quy tắc cấm bệnh lý (${condition}): Có chứa từ khóa hạn chế "${kw}".`
        };
      }
    }

    if (condition === MEDICAL_CONDITIONS.CKD) {
      // [2026-09-21] SỬA LỖI: item lấy từ loadDishPool() (plan.routes.js) có
      // field dạng snake_case (sodium_mg/potassium_mg), không phải camelCase
      // (sodiumMg/potassiumMg) như trước — điều kiện cũ luôn undefined nên
      // KHÔNG BAO GIỜ chạy. Giới hạn sodium/potassium thực ra đã được enforce
      // qua CONDITION_NUTRIENT_LIMITS (constants.js) nên không "mất tác
      // dụng" hoàn toàn, nhưng khối này tưởng chạy mà không chạy — sửa cho
      // đúng ý đồ, đồng thời cân nhắc bỏ CONDITION_NUTRIENT_LIMITS phía
      // constants.js để chỉ còn 1 nguồn ngưỡng dinh dưỡng duy nhất (tránh
      // lệch nhau khi sửa sau này).
      if (item.sodium_mg && item.sodium_mg > CKD_NUTRIENT_LIMITS.SODIUM_MG_MAX) {
        return {
          isBanned: true,
          reason: `Vượt ngưỡng Natri an toàn cho bệnh thận mạn (>${CKD_NUTRIENT_LIMITS.SODIUM_MG_MAX}mg).`
        };
      }
      if (item.potassium_mg && item.potassium_mg > CKD_NUTRIENT_LIMITS.POTASSIUM_MG_MAX) {
        return {
          isBanned: true,
          reason: `Vượt ngưỡng Kali an toàn cho bệnh thận mạn (>${CKD_NUTRIENT_LIMITS.POTASSIUM_MG_MAX}mg).`
        };
      }
    }
  }

  return { isBanned: false, reason: null };
}

// [2026-09-21] Chưa có field phosphorus_mg trong catalog (cả bảng dishes lẫn
// raw_foods) - PHOSPHORUS_MG_MAX ở trên hiện KHÔNG kiểm tra được, cần bổ
// sung nguồn dữ liệu phosphorus trước khi bật lại kiểm tra này.
// POTASSIUM_MG_MIN cũng chưa được dùng ở đâu (thiếu kali cũng có rủi ro
// nhưng "cấm món" không phải cách xử lý đúng cho ngưỡng TỐI THIỂU — cần
// thiết kế riêng, vd gợi ý bổ sung thay vì loại trừ).

// [2026-09-21] BỔ SUNG - resolver từ tên bệnh tự do (tiếng Việt, người dùng
// tự nhập ở ConditionsScreen/health.routes.js) sang enum MEDICAL_CONDITIONS.
// Trước đây HARD_BAN_KEYWORDS không bao giờ được áp dụng trong thực tế vì
// (1) không có hàm nào chuyển "Suy thận mạn tính" (text tự do) sang "CKD"
// (enum key) và (2) resolveUserFilters()/plan.routes.js chưa từng gọi hàm
// này hay truyền userConditions vào generateDishMealPlan — toàn bộ danh
// sách cấm theo bệnh (kể cả gout/G6PD/PKU...) chưa từng có hiệu lực trên
// request thật. Xem plan.routes.js đã sửa để wire lại.
const CONDITION_NAME_KEYWORDS = {
  [MEDICAL_CONDITIONS.GOUT]: ["gút", "gout", "axit uric", "acid uric"],
  [MEDICAL_CONDITIONS.DIABETES]: ["tiểu đường", "đái tháo đường", "tieu duong"],
  [MEDICAL_CONDITIONS.CKD]: ["suy thận", "thận mạn", "thận yếu"],
  [MEDICAL_CONDITIONS.G6PD]: ["g6pd", "thiếu men g6pd", "favism"],
  [MEDICAL_CONDITIONS.HFI]: ["bất dung nạp fructose", "hfi", "fructose di truyền"],
  [MEDICAL_CONDITIONS.PKU]: ["phenylketonuria", "pku", "phenylalanin"],
  [MEDICAL_CONDITIONS.GALACTOSEMIA]: ["galactosemia", "không dung nạp galactose"],
  [MEDICAL_CONDITIONS.ALPHA_GAL]: ["alpha-gal", "alpha gal", "dị ứng thịt đỏ do bọ ve"],
  [MEDICAL_CONDITIONS.HYPOTHYROIDISM]: ["suy giáp", "cường giáp", "hashimoto", "tuyến giáp"],
  [MEDICAL_CONDITIONS.GERD]: ["trào ngược dạ dày", "gerd", "trào ngược thực quản"],
  [MEDICAL_CONDITIONS.ASTHMA_SULFITE]: ["hen suyễn", "hen phế quản", "asthma"],
  [MEDICAL_CONDITIONS.OAS_PFAS]: ["dị ứng phấn hoa", "oas", "pfas", "dị ứng miệng"],
  [MEDICAL_CONDITIONS.EOE]: ["viêm thực quản tăng bạch cầu ái toan", "eoe"],
  [MEDICAL_CONDITIONS.FPIES]: ["fpies", "viêm ruột do protein thực phẩm"],
  [MEDICAL_CONDITIONS.MCAS_HISTAMINE]: ["mcas", "bất dung nạp histamine", "hoạt hóa tế bào mast"],
  [MEDICAL_CONDITIONS.MAOI_TYRAMINE]: ["maoi", "thuốc chống trầm cảm maoi"],
  [MEDICAL_CONDITIONS.STATIN_GRAPEFRUIT]: ["statin", "atorvastatin", "simvastatin", "lovastatin", "hạ mỡ máu"],
};

export function resolveMedicalConditionKeys(freeTextName) {
  const lower = (freeTextName || "").toLowerCase();
  return Object.entries(CONDITION_NAME_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k)))
    .map(([key]) => key);
}
