/**
 * Auto-launch policy for the scanned anonymous cashier.
 *
 * Inside WeChat/Alipay the provider app is already running, so the cashier must
 * open its native payment sheet immediately (with the method buttons still
 * available as a manual retry). In a plain browser there is no provider app to
 * invoke: the payer must choose a method first, so the page stays manual.
 */
import type { PaymentEnvironment } from '@sdkwork/order-mobile-react-orders';

import type { AnonymousMethodOption, AnonymousWireMethod } from './anonymousCashier.js';

/** True only when the current host app can be woken up to pay in place. */
export function shouldAutoLaunchCashier(environment: PaymentEnvironment): boolean {
  return environment === 'wechat' || environment === 'alipay';
}

/**
 * Picks the method to auto-launch, or `null` when the payer must choose.
 *
 * The method options are already environment-narrowed by
 * `resolveAnonymousMethodOptions`, so the first option is the provider's
 * in-app method when one is available.
 */
export function resolveAutoLaunchMethod(
  environment: PaymentEnvironment,
  options: readonly AnonymousMethodOption[],
): AnonymousWireMethod | null {
  if (!shouldAutoLaunchCashier(environment)) {
    return null;
  }
  return options[0]?.method ?? null;
}
