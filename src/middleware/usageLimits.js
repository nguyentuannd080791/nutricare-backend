import { FREE_LIMITS } from "../domain/constants.js";
import { HttpError } from "../errors.js";

// Server là nơi DUY NHẤT quyết định có cho gọi AI hay không — bộ đếm nằm
// trong DB, client không sửa được.
function enforceLimit(counterField, limit, message) {
  return (req, _res, next) => {
    if (!req.user.isPremium && req.user[counterField] >= limit) throw new HttpError(403, message);
    next();
  };
}

export const enforceAiPlanLimit = enforceLimit("aiPlanCount", FREE_LIMITS.aiPlan, "Bạn đã dùng hết lượt gợi ý AI miễn phí.");
export const enforceScanLimit = enforceLimit("scanCount", FREE_LIMITS.scan, "Bạn đã dùng hết lượt quét món ăn miễn phí.");
