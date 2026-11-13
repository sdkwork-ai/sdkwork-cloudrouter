/**
 * Deep-link adoption for the order/cashier routes on the H5 renderer.
 *
 * The platform emits the cashier entry as a real pathname
 * (`{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`, see
 * `sdkwork-utils-rust::build_commerce_cashier_url`) while the H5 renderer routes
 * with `HashRouter`. Before the first render the bootstrap folds such a
 * navigation into its hash route, so one URL shape opens the cashier from a
 * scanned QR code and from the authenticated console alike.
 */
import { CLOUDROUTER_H5_ORDER_DEEP_LINK_PREFIXES } from '@sdkwork/cloudrouter-h5-orders/routes';

/**
 * Resolves the hash route for an order/cashier pathname.
 * @param pathname - the navigation pathname.
 * @param search - the navigation query string (kept inside the hash route so
 * the cashier can read `scene`/`outTradeNo` through `useSearchParams`).
 * @returns the `#/...` route, or null when the pathname is not an order route.
 */
export function resolveOrderDeepLinkHash(pathname: string, search: string): string | null {
  const matched = CLOUDROUTER_H5_ORDER_DEEP_LINK_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/u, '') || pathname.startsWith(prefix),
  );
  if (!matched) {
    return null;
  }
  return `#${pathname}${search}`;
}

/**
 * Rewrite an order/cashier navigation pathname into the equivalent hash route.
 * @param location - the window location to inspect (defaults to the live one).
 * @param history - the history object used for the replacement (defaults to the live one).
 * @returns the adopted hash route, or null when nothing changed.
 */
export function adoptOrderDeepLinkHash(
  location: { hash: string; pathname: string; search: string } = window.location,
  history: Pick<History, 'state' | 'replaceState'> = window.history,
): string | null {
  if (location.hash.startsWith('#/')) return null;
  const hash = resolveOrderDeepLinkHash(location.pathname, location.search);
  if (hash === null) return null;
  history.replaceState(history.state, '', `${location.pathname}${hash}`);
  return hash;
}
