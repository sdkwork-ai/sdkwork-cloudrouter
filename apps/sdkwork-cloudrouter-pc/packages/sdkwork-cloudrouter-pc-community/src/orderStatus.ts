/**
 * Canonical order statuses that mean money has settled.
 *
 * sdkwork-order normalizes payment attempts through `paid`/`succeeded`/
 * `success`, while completed orders also appear as `completed`/`fulfilled`/
 * `finished`. Membership activation must accept every one of them or a paid
 * user can stay outside the circle forever.
 */
const PAID_ORDER_STATUSES = new Set([
  'paid',
  'succeeded',
  'success',
  'completed',
  'fulfilled',
  'finished',
]);

export function isPaidCircleOrderStatus(status: string): boolean {
  return PAID_ORDER_STATUSES.has(status.trim().toLowerCase());
}
