export const RESET_TOKEN_TTL_MINUTES = 15;
export const RESEND_COOLDOWN_SECONDS = 60;

export function calcResetExpiry(now) {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}

export function isResendTooSoon(lastCreatedAt, now) {
  if (!lastCreatedAt) return false;
  return now.getTime() - lastCreatedAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000;
}
