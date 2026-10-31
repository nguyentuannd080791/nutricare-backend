import { isAdminEmail } from "../domain/adminAccess.js";
import { HttpError } from "../errors.js";

// Đặt SAU requireAuth. Đọc ADMIN_EMAILS mỗi request nên đổi .env + khởi động lại là đủ.
export function requireAdmin(req, _res, next) {
  if (!isAdminEmail(req.user.email, process.env.ADMIN_EMAILS)) throw new HttpError(403, "Bạn không có quyền truy cập trang quản trị.");
  next();
}
