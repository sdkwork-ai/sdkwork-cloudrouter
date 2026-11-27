/**
 * Presentation helpers for the relay recharge dialog.
 *
 * They are pure so the dialog stays a rendering component and the amount,
 * points, and status rules can be tested without React or the backend.
 */

/** Formats a major-unit decimal string with the currency's Intl rules. */
export function formatRechargeMoney(amount: string, currencyCode: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return `${amount} ${currencyCode}`.trim();
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${amount} ${currencyCode}`.trim();
  }
}

/** Formats a points grant; the relay's unit label is appended when known. */
export function formatRechargePoints(points: number, pointsUnit: string): string {
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(points);
  return pointsUnit ? `${formatted} ${pointsUnit}` : formatted;
}

/**
 * Metric-friendly label key for a relay order status.
 *
 * Unknown relay vocabulary degrades to `pending` so the dialog never renders a
 * raw enum value to an operator.
 */
export function rechargeOrderStatusKey(status: string): string {
  switch (status.trim().toLowerCase()) {
    case 'paid':
      return 'admin.upstream.supplier.recharge.order.status.paid';
    case 'failed':
      return 'admin.upstream.supplier.recharge.order.status.failed';
    case 'cancelled':
    case 'canceled':
      return 'admin.upstream.supplier.recharge.order.status.cancelled';
    default:
      return 'admin.upstream.supplier.recharge.order.status.pending';
  }
}

/** Whether an order still needs payment polling. */
export function rechargeOrderIsOpen(status: string): boolean {
  return !['paid', 'failed', 'cancelled', 'canceled'].includes(status.trim().toLowerCase());
}

/**
 * Resolves the display unit for the relay's point asset.
 *
 * `POINTS` is the language-neutral value the relay advertises; the console
 * translates it with its own copy instead of rendering the raw acronym.
 */
export function rechargePointsUnitLabelKey(pointsUnit: string): string | null {
  return pointsUnit.trim().toUpperCase() === 'POINTS'
    ? 'admin.upstream.supplier.recharge.unit.points'
    : null;
}
