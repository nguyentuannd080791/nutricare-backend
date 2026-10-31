import { HttpError } from "./errors.js";
import { isDateKey } from "./domain/dateKey.js";

export function requireNumber(value, { min, max, label }) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `${label} không hợp lệ (${min}–${max}).`);
  }
  return value;
}

export function requireInteger(value, options) {
  if (!Number.isInteger(value)) throw new HttpError(400, `${options.label} không hợp lệ.`);
  return requireNumber(value, options);
}

export function requireText(value, { label, max = 100 }) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) throw new HttpError(400, `${label} không hợp lệ.`);
  return text;
}

const MIN_PASSWORD_LENGTH = 8;

// Chỉ dùng khi tạo mật khẩu mới. Đăng nhập không kiểm tra độ mạnh để tài khoản cũ vẫn vào được.
export function requireNewPassword(value) {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Mật khẩu cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`);
  }
  if (!/[a-z]/.test(value)) throw new HttpError(400, "Mật khẩu cần có ít nhất 1 chữ cái thường.");
  if (!/\d/.test(value)) throw new HttpError(400, "Mật khẩu cần có ít nhất 1 chữ số.");
  return value;
}

// Phân trang cho các endpoint tra cứu catalog.
export function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

// :id số nguyên trong URL — NaN sẽ làm Prisma báo lỗi 500, nên chuyển thành 404.
export function parseIdParam(value, notFoundMessage) {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new HttpError(404, notFoundMessage);
  return id;
}

export function requireDateKey(value, label) {
  if (!isDateKey(value)) throw new HttpError(400, `${label} không hợp lệ (YYYY-MM-DD).`);
  return value;
}

export function parseAdminUsersQuery(query) {
  let page = 1;
  if (query.page !== undefined && query.page !== "") {
    const p = Number(query.page);
    if (!Number.isInteger(p) || p < 1) {
      throw new HttpError(400, "Tham số page không hợp lệ.");
    }
    page = p;
  }

  let pageSize = 20;
  if (query.pageSize !== undefined && query.pageSize !== "") {
    const ps = Number(query.pageSize);
    if (!Number.isInteger(ps) || ps < 1 || ps > 50) {
      throw new HttpError(400, "Tham số pageSize không hợp lệ (1–50).");
    }
    pageSize = ps;
  }

  let search;
  if (query.search !== undefined && query.search !== "") {
    const s = String(query.search).trim();
    if (s.length > 100) {
      throw new HttpError(400, "Tìm kiếm tối đa 100 ký tự.");
    }
    if (s.length > 0) search = s;
  }

  let premium;
  if (query.premium !== undefined && query.premium !== "") {
    if (query.premium === "true" || query.premium === true) premium = true;
    else if (query.premium === "false" || query.premium === false) premium = false;
    else throw new HttpError(400, "Tham số premium không hợp lệ.");
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    search,
    premium,
  };
}

