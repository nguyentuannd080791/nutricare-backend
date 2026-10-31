// Ngày nghỉ xả hơi hằng tuần (0 = Chủ nhật). Đổi danh sách này nếu muốn nghỉ ngày khác.
export const REST_WEEKDAYS = [0];

export function isRestDay(dateKey) {
  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return REST_WEEKDAYS.includes(weekday);
}
