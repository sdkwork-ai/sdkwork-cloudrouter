/**
 * Cashier capability-window arithmetic, shared by every cart surface.
 *
 * The payment backend caps the provider trade — and the anonymous-cashier
 * capability token — at 15 minutes while the order itself stays payable for 30,
 * and it echoes the attempt window back as `paymentParams.expiresAt`. Counting
 * down the order's own deadline therefore keeps a live-looking QR on screen for
 * up to 15 minutes after the trade died, and scanning it can only fail.
 *
 * The rule is the earliest of the two windows, falling back to whichever one
 * exists (sandbox trades and older responses carry no provider window).
 */

/** Parses an RFC3339 timestamp to epoch milliseconds, or NaN when unusable. */
function parseTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  return Date.parse(value);
}

/**
 * Resolves the deadline the cashier must count down and stop rendering at.
 *
 * @param orderExpireTime order's own `expireTime` (RFC3339)
 * @param attemptExpireTime provider attempt window (`paymentParams.expiresAt`)
 * @returns the earliest valid deadline as an RFC3339 UTC string, or undefined
 *          when neither window is usable
 */
export function resolveCashierExpiresAt(
  orderExpireTime: string | undefined,
  attemptExpireTime: string | undefined,
): string | undefined {
  const orderMs = parseTimestamp(orderExpireTime);
  const attemptMs = parseTimestamp(attemptExpireTime);
  if (!Number.isFinite(attemptMs)) {
    return orderExpireTime;
  }
  if (!Number.isFinite(orderMs)) {
    return attemptExpireTime;
  }
  return new Date(Math.min(orderMs, attemptMs)).toISOString();
}
