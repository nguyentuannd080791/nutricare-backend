// CẢNH BÁO QUAN TRỌNG: đây là gắn tag HEURISTIC dựa trên từ khoá trong tên
// món ăn tiếng Việt — KHÔNG phải phân tích thành phần thật. Với các trường
// hợp AN TOÀN QUAN TRỌNG (dị ứng hải sản, đậu phộng...), heuristic theo tên
// món có thể BỎ SÓT (false negative) — vd món "Bún riêu" không có từ khoá
// "hải sản"/"cua" rõ ràng trong tên dù thực tế có cua. KHÔNG dùng kết quả
// này làm nguồn duy nhất cho quyết định an toàn dị ứng ở production thật —
// cần review thủ công hoặc đối chiếu với dữ liệu thành phần món ăn thật (nếu
// có) trước khi tin tưởng hoàn toàn. Dùng tạm cho giai đoạn test/POC.
//
// Tag dùng lại ĐÚNG vocabulary đã có trong domain/constants.js
// (AVOID_TAG_LABELS) để tương thích với cơ chế excludeTags hiện có.

const KEYWORD_RULES = [
  { tag: "hai_san", keywords: ["tôm", "cua", "mực", "ốc", "ngao", "sò", "hàu", "ghẹ", "hải sản", "cá ", "trai", "hến", "bào ngư", "bạch tuộc", "don ", "vẹm"] },
  { tag: "dau_phong", keywords: ["đậu phộng", "lạc rang", "lạc"] },
  { tag: "sua", keywords: ["sữa", "phô mai", "bơ", "kem tươi", "yaourt", "sữa chua"] },
  // Chỉ gluten từ lúa mì thật (bún/phở/miến đều làm từ gạo - KHÔNG chứa gluten).
  { tag: "gluten", keywords: ["bánh mì", "mì ăn liền", "mì tôm", "mì gói", "bánh quy", "bột mì", "mì ý", "mì udon", "mì trứng"] },
  { tag: "thit_ca", keywords: ["thịt", "cá ", "gà", "heo", "lợn", "bò", "tôm", "cua", "mực", "giò", "chả", "xúc xích", "trứng"] },
  // Không có dữ liệu purin thật - suy đoán từ nhóm thực phẩm purin cao đã biết.
  { tag: "purin_cao", keywords: ["nội tạng", "gan", "lòng", "hải sản", "cua", "tôm", "thịt bò", "thịt dê"] },
];

export function tagDish(nameVi) {
  const lower = (nameVi || "").toLowerCase();
  const tags = new Set();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      tags.add(rule.tag);
    }
  }
  return Array.from(tags);
}
