// Quyền admin lấy từ biến môi trường ADMIN_EMAILS (danh sách email, ngăn cách
// bằng dấu phẩy) — không lưu trong DB, không có API nào cấp/thu quyền.
export function parseAdminEmails(raw) {
  return new Set(
    String(raw ?? "")
      .replace(/^["']|["']$/g, "")
      .split(",")
      .map((e) => e.trim().toLowerCase().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
  );
}

export const isAdminEmail = (email, rawAdminEmails) => parseAdminEmails(rawAdminEmails).has(String(email ?? "").toLowerCase());
