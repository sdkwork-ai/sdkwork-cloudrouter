import type {
  CashierOrder,
  CashierPayment,
  CashierStatus,
  SdkworkAppClient,
} from '@sdkwork/order-app-sdk';

import type { AnonymousWireMethod } from './anonymousPaymentLaunch.js';
import { requireCloudRouterOrderAppClient } from './runtime.js';

export {
  CASHIER_TOKEN_PREFIX,
  isCashierCapabilityToken,
} from './capabilityToken.js';
export {
  resolveAnonymousMethodOptions,
  resolveCashierLaunch,
} from './anonymousPaymentLaunch.js';
export type {
  AnonymousMethodOption,
  AnonymousWireMethod,
  CashierLaunch,
} from './anonymousPaymentLaunch.js';

/** Loads the anonymous cashier view. */
export async function loadAnonymousCashier(token: string): Promise<CashierOrder> {
  const client: SdkworkAppClient = requireCloudRouterOrderAppClient();
  return client.orderCashier.cashier.retrieve(token);
}

/**
 * Exchanges a legacy token-less cashier link for a capability token.
 *
 * Older QR codes carry `{base}/cashier/{orderId}?scene=..&outTradeNo=..`. The
 * order service verifies that the trade number matches the order (or its latest
 * payment attempt) and mints a short-lived token, so an already-issued link
 * opens the no-login cashier instead of the login wall.
 *
 * @param orderId - order primary key from the legacy path segment.
 * @param outTradeNo - merchant trade number from the legacy query string.
 * @returns the signed capability token.
 */
export async function resolveLegacyCashierToken(
  orderId: string,
  outTradeNo: string,
): Promise<string> {
  const client: SdkworkAppClient = requireCloudRouterOrderAppClient();
  const link = await client.orderCashier.cashier.links.create({ orderId, outTradeNo });
  const token = link?.token?.trim();
  if (!token) {
    throw new Error('Cashier link exchange returned no capability token.');
  }
  return token;
}

/** Creates a payment for the anonymous cashier. */
export async function createAnonymousCashierPayment(
  token: string,
  paymentMethod: AnonymousWireMethod,
  authorization?: { readonly openid: string; readonly openidBinding: string },
): Promise<CashierPayment> {
  const client: SdkworkAppClient = requireCloudRouterOrderAppClient();
  return client.orderCashier.cashier.payments.create(token, {
    paymentMethod,
    ...(authorization
      ? { openid: authorization.openid, openidBinding: authorization.openidBinding }
      : {}),
  });
}

/** Reads the anonymous cashier payment status. */
export async function loadAnonymousCashierStatus(token: string): Promise<CashierStatus> {
  const client: SdkworkAppClient = requireCloudRouterOrderAppClient();
  return client.orderCashier.cashier.status.retrieve(token);
}

/** True when a cashier order status means the payment settled. */
export function isCashierPaidStatus(status: string | undefined): boolean {
  const normalized = (status ?? '').trim().toLowerCase();
  return ['paid', 'fulfilled', 'completed', 'refunding', 'refunded'].includes(normalized);
}

/** True when a cashier order status is terminal and unpaid. */
export function isCashierClosedStatus(status: string | undefined): boolean {
  const normalized = (status ?? '').trim().toLowerCase();
  return ['cancelled', 'closed', 'expired', 'timeout', 'refund'].includes(normalized);
}
