import type { CashierPayment } from '@sdkwork/order-app-sdk';
import type { PaymentEnvironment } from '@sdkwork/order-mobile-react-orders';

/**
 * No-login cashier payment-method matrix and launch projection.
 *
 * This module is deliberately transport-free: it maps the server's allowed
 * methods and the provider payment params onto what the current device can
 * actually launch. Keeping it free of the order SDK runtime is what lets the
 * matrix be unit-tested, and it documents the device-specific contract:
 *
 * - WeChat webview → JSAPI (or WeChat H5 fallback)
 * - Alipay webview → Alipay WAP in-page redirect
 * - plain mobile browser → provider H5 trades
 * - desktop browser → native QR trades (`wechat_pay` / `alipay`)
 */

/** Anonymous wire methods the cashier may request. */
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
 * A desktop browser is the one surface where a native QR is the right control.
 */
export function resolveAnonymousMethodOptions(
  environment: PaymentEnvironment,
  allowedMethods: readonly string[],
  isMobile: boolean,
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
  if (!isMobile) {
    // Desktop payer: render a native QR code for the phone to scan. A mobile
    // H5 redirect would open a provider page this browser cannot complete.
    const desktop: AnonymousMethodOption[] = [];
    if (allowed.has('wechat_pay')) desktop.push({ method: 'wechat_pay', ...WECHAT_OPTION });
    if (allowed.has('alipay')) desktop.push({ method: 'alipay', ...ALIPAY_OPTION });
    return desktop;
  }
  const options: AnonymousMethodOption[] = [];
  if (allowed.has('wechat_h5')) options.push({ method: 'wechat_h5', ...WECHAT_OPTION });
  if (allowed.has('alipay_wap')) options.push({ method: 'alipay_wap', ...ALIPAY_OPTION });
  return options;
}

/** Launch target extracted from a provider payment result. */
export type CashierLaunch =
  | { readonly kind: 'redirect'; readonly url: string }
  | { readonly kind: 'jsapi'; readonly payload: Record<string, unknown> }
  | { readonly kind: 'qr'; readonly payload: string }
  | { readonly kind: 'unavailable' };

/**
 * Resolves how the payer completes the payment from the provider params.
 *
 * `wechat_pay` / `alipay` are native QR trades: their scannable payload is what a
 * desktop cashier renders. `payUrl` is what the backend sets for `wechat_h5`
 * (`h5_url`) and `alipay_wap`; `jsapiPayload` is the WeChat bridge payload used
 * inside the WeChat webview. `cashierUrl` is deliberately **not** used as QR
 * content: scanning it would reopen this cashier instead of paying.
 */
export function resolveCashierLaunch(payment: CashierPayment): CashierLaunch {
  const params = payment.paymentParams ?? {};
  if (payment.paymentMethod === 'wechat_jsapi' && params.jsapiPayload) {
    try {
      const payload = JSON.parse(params.jsapiPayload) as Record<string, unknown>;
      return { kind: 'jsapi', payload };
    } catch {
      return { kind: 'unavailable' };
    }
  }
  const qrPayload = params.qrCodePayload ?? params.qrCodeUrl;
  if (
    qrPayload
    && (payment.paymentMethod === 'wechat_pay' || payment.paymentMethod === 'alipay')
    && /^(https?|weixin|wxpay|alipays?):/iu.test(qrPayload)
  ) {
    return { kind: 'qr', payload: qrPayload };
  }
  const url = params.payUrl ?? params.h5Url;
  if (url && /^https?:/i.test(url)) {
    return { kind: 'redirect', url };
  }
  return { kind: 'unavailable' };
}
