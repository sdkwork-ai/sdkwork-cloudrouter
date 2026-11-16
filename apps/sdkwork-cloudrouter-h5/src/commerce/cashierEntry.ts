/**
 * How the H5 cashier entry resolves its capability.
 *
 * The unified cashier URL has two shapes:
 *
 * - `{base}/cashier/{token}` — a signed capability token (the current form), and
 * - `{base}/cashier/{orderId}?scene=..&outTradeNo=..` — a legacy QR issued before
 *   tokens existed.
 *
 * Both must open the cashier without a session: the legacy pair is exchanged for
 * a token before the page renders. A bare order id with no trade number cannot
 * be exchanged, so it keeps the authenticated order flow.
 */
import { isCashierCapabilityToken } from '@sdkwork/cloudrouter-h5-orders/capabilityToken';

export type CashierEntryPlan =
  | { readonly kind: 'token'; readonly token: string }
  | { readonly kind: 'exchange'; readonly orderId: string; readonly outTradeNo: string }
  | { readonly kind: 'login' };

/**
 * Decides how the cashier path segment resolves.
 * @param segment - the `/cashier/:orderId` path parameter.
 * @param outTradeNo - the `outTradeNo` query parameter, if any.
 * @returns the token to render, the legacy pair to exchange, or the login gate.
 */
export function planCashierEntry(
  segment: string | undefined,
  outTradeNo: string | null | undefined,
): CashierEntryPlan {
  const value = segment?.trim() ?? '';
  if (isCashierCapabilityToken(value)) {
    return { kind: 'token', token: value };
  }
  if (!value) {
    return { kind: 'login' };
  }
  const tradeNo = (outTradeNo ?? '').trim();
  if (!tradeNo) {
    return { kind: 'login' };
  }
  return { kind: 'exchange', orderId: value, outTradeNo: tradeNo };
}
