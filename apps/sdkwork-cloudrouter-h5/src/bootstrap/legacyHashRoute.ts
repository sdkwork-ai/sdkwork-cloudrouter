/**
 * Legacy hash-route adoption for the H5 renderer.
 *
 * The H5 renderer routes with the History API (`BrowserRouter`), the same mode
 * as the PC renderer, so the cashier deep link the order/payment backend emits
 * (`{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`, see
 * `sdkwork-utils-rust::build_commerce_cashier_url`) and every hosted app sign-in
 * pathname stay exactly as the navigation arrived — the URL is never rewritten
 * into a `#/` route.
 *
 * Links written while the H5 renderer still routed with `HashRouter`
 * (`{origin}/#/cashier/{orderId}`) are normalized to their real pathname before
 * the first render, so a printed QR code, a bookmarked console tab, or an older
 * mini-program build keeps opening the same screen instead of the console
 * fallback. A URL that a previous build had already folded into
 * `/cashier/{id}#/cashier/{id}` is normalized by the same step.
 */

/**
 * Resolves the real pathname a legacy hash route points at.
 * @param hash - `window.location.hash`, including its leading `#`.
 * @returns the pathname plus its search string, or null when the hash is not a
 * route (an empty fragment, `#/`, or an in-page anchor).
 */
export function resolveLegacyHashRoute(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const route = hash.slice(1);
  if (route === '/' || route.trim() === '') return null;
  return route;
}

/**
 * Rewrites a legacy `#/...` navigation into the equivalent real pathname.
 * @param location - the window location to inspect (defaults to the live one).
 * @param history - the history object used for the replacement (defaults to the live one).
 * @returns the adopted pathname, or null when nothing changed.
 */
export function adoptLegacyHashRoute(
  location: { hash: string; pathname: string; search: string } = window.location,
  history: Pick<History, 'state' | 'replaceState'> = window.history,
): string | null {
  const route = resolveLegacyHashRoute(location.hash);
  if (route === null) return null;
  history.replaceState(history.state, '', route);
  return route;
}
