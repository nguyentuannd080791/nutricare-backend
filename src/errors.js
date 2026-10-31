// Lỗi nghiệp vụ có mã HTTP — service/route chỉ việc `throw new HttpError(...)`,
// errorHandler (index.js) chuyển thành response { error }.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
