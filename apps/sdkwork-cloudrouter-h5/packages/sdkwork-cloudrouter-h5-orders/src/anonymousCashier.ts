import type {
  CashierOrder,
  CashierPayment,
  CashierStatus,
  SdkworkAppClient,
} from '@sdkwork/order-app-sdk';
import type { PaymentEnvironment } from '@sdkwork/order-mobile-react-orders';

import { requireCloudRouterOrderAppClient } from './runtime.js';

export {
  CASHIER_TOKEN_PREFIX,
  isCashierCapabilityToken,
} from './capabilityToken.js';

/**
 * Anonymous wire methods the cashier may request.
 *
 * `wechat_jsapi` is available because the IAM anonymous payment OAuth can bind a
 * payer openid to the capability token; the caller can still never supply an
 * openid of its own choosing (the binding is signed server-side).
 */
export type AnonymousWireMethod =
  | 'wechat_pay'
  | 'wechat_h5'
  | 'wechat_jsapi'
  | 'alipay'
  | 'alipay_wap';

/** One selectable payment option for the anonymous cashier. */
export interface AnonymousMethodOption {
  readonly method: AnonymousWireMethod;
  readonly labelKey: string;
  readonly labelDefault: string;
  readonly badge: string;
  readonly badgeClass: string;
}

const WECHAT_OPTION = {
  labelKey: 'orders.payment_method_wechat_pay',
  labelDefault: '微信支付',
  badge: '微',
  badgeClass: 'bg-[#07C160]',
} as const;
const ALIPAY_OPTION = {
  labelKey: 'orders.payment_method_alipay',
  labelDefault: '支付宝',
  badge: '支',
  badgeClass: 'bg-[#1677FF]',
} as const;

/**
 * Narrows the server's allowed method list to what the current client can launch.
 *
 * The phone is the device being paid on, so a native scan code is useless: inside
 * WeChat only JSAPI can complete, inside Alipay only the in-app WAP cashier, and a
 * plain mobile browser needs the provider H5 trade (`wechat_h5` / `alipay_wap`).
 */
export function resolveAnonymousMethodOptions(
  environment: PaymentEnvironment,
  allowedMethods: readonly string[],
): readonly AnonymousMethodOption[] {
  const allowed = new Set(allowedMethods);
  if (environment === 'wechat') {
    // Inside WeChat only the JSAPI bridge can complete a payment; the H5 trade is
    // for payer browsers outside WeChat.
    if (allowed.has('wechat_jsapi')) return [{ method: 'wechat_jsapi', ...WECHAT_OPTION }];
    return allowed.has('wechat_h5') ? [{ method: 'wechat_h5', ...WECHAT_OPTION }] : [];
  }
  if (environment === 'alipay') {
    return allowed.has('alipay_wap') ? [{ method: 'alipay_wap', ...ALIPAY_OPTION }] : [];
  }
  const options: AnonymousMethodOption[] = [];
  if (allowed.has('wechat_h5')) options.push({ method: 'wechat_h5', ...WECHAT_OPTION });
  if (allowed.has('alipay_wap')) options.push({ method: 'alipay_wap', ...ALIPAY_OPTION });
  return options;
}

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

/** Launch target extracted from a provider payment result. */
export type CashierLaunch =
  | { readonly kind: 'redirect'; readonly url: string }
  | { readonly kind: 'jsapi'; readonly payload: Record<string, unknown> }
  | { readonly kind: 'unavailable' };

/**
 * Resolves how the payer completes the payment from the provider params.
 *
 * `payUrl` is what the backend sets for `wechat_h5` (`h5_url`) and `alipay_wap`;
 * `jsapiPayload` is the WeChat bridge payload used inside the WeChat webview.
 */
export function resolveCashierLaunch(payment: CashierPayment): CashierLaunch {
  const params = payment.paymentParams ?? {};
  const url = params.payUrl ?? params.h5Url ?? params.cashierUrl;
  if (payment.paymentMethod === 'wechat_jsapi' && params.jsapiPayload) {
    try {
      const payload = JSON.parse(params.jsapiPayload) as Record<string, unknown>;
      return { kind: 'jsapi', payload };
    } catch {
      return { kind: 'unavailable' };
    }
  }
  if (url && /^https?:/i.test(url)) {
    return { kind: 'redirect', url };
  }
  return { kind: 'unavailable' };
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
