// Ngày dạng "YYYY-MM-DD" theo UTC — cùng quy ước với dateKey() phía client.
const DAY_MS = 86400000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toDateKey = (d) => new Date(d).toISOString().slice(0, 10);

// Chặn cả chuỗi sai dạng lẫn ngày không tồn tại ("2026-02-31" bị Date tự đổi sang tháng 3).
export function isDateKey(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const ms = Date.parse(value);
  return !Number.isNaN(ms) && toDateKey(ms) === value;
}

export const shiftDateKey = (key, days) => toDateKey(Date.parse(key) + days * DAY_MS);

// Danh sách ngày liên tiếp [from, to], gồm cả hai đầu.
export function dateRange(from, to) {
  const keys = [];
  for (let k = from; k <= to; k = shiftDateKey(k, 1)) keys.push(k);
  return keys;
}
