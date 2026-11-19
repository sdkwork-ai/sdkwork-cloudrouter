import type { CircleMembershipOrderResult } from './runtime.ts';

export interface PendingCircleOrder {
  readonly order: CircleMembershipOrderResult;
  readonly tierId: string;
  readonly packageId: string;
  readonly lifetime: boolean;
}

const STORAGE_PREFIX = 'cloudrouter.community.pendingOrder.';

function storage(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function key(circleId: string): string {
  return `${STORAGE_PREFIX}${circleId}`;
}

export function savePendingCircleOrder(circleId: string, pending: PendingCircleOrder): void {
  const target = storage();
  if (!target) return;
  try {
    target.setItem(key(circleId), JSON.stringify(pending));
  } catch {
    // A full or disabled session storage must not block the payment flow.
  }
}

export function readPendingCircleOrder(circleId: string): PendingCircleOrder | null {
  const target = storage();
  if (!target) return null;
  try {
    const raw = target.getItem(key(circleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCircleOrder>;
    const order = parsed.order as Partial<CircleMembershipOrderResult> | undefined;
    if (
      !order
      || typeof order.orderId !== 'string'
      || typeof order.orderNo !== 'string'
      || typeof order.amount !== 'string'
      || typeof order.cashierUrl !== 'string'
      || typeof parsed.tierId !== 'string'
      || typeof parsed.packageId !== 'string'
      || typeof parsed.lifetime !== 'boolean'
    ) {
      return null;
    }
    return {
      order: {
        orderId: order.orderId,
        orderNo: order.orderNo,
        amount: order.amount,
        cashierUrl: order.cashierUrl,
      },
      tierId: parsed.tierId,
      packageId: parsed.packageId,
      lifetime: parsed.lifetime,
    };
  } catch {
    return null;
  }
}

export function clearPendingCircleOrder(circleId: string): void {
  const target = storage();
  if (!target) return;
  try {
    target.removeItem(key(circleId));
  } catch {
    // Ignore storage cleanup failures.
  }
}
