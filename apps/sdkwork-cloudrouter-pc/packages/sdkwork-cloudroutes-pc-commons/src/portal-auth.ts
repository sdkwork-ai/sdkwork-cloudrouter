import { isSdkworkIamSessionAuthenticated } from '@sdkwork/iam-runtime';

import {
  loadStoredAppSessionToken,
} from './app-session-token.ts';
import { PORTAL_OAUTH_SIGN_IN_STATE_PARAM } from './portal-oauth-params.ts';
import { PORTAL_SESSION_CHANGE_EVENT } from './portal-session-events.ts';

export interface PortalAuthLocationLike {
  hash?: string;
  pathname: string;
  search?: string;
}

export type PortalLoginRequiredActionDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

const DEFAULT_HOME_PATH = '/';
const AUTH_BASE_PATH = '/auth';
const AUTH_LOGIN_PATH = '/auth/login';
/**
 * Hosted sign-out page. The page itself is implemented by the shared IAM auth
 * package (`@sdkwork/auth-pc-react` serves it below whichever auth base path a
 * host mounts); this application owns the URL path and publishes it, so the
 * desktop shells and partner surfaces that open the page in a system browser
 * can link to it without depending on this application's bundle.
 *
 * Authenticated visitors must keep this route: redirecting them to the portal
 * home — the normal treatment for `/auth/*` — would make signing out
 * impossible. `PortalAuthenticatedAuthRouteGuard` exempts it explicitly.
 */
export const PORTAL_AUTH_BASE_PATH = AUTH_BASE_PATH;
export const PORTAL_AUTH_SIGN_OUT_PATH = `${AUTH_BASE_PATH}/sign-out`;
/**
 * Landing path for a fresh authenticated session whose URL carries no
 * `redirect` target. It is the public portal home, never the operator
 * `/admin` console: `/admin` is permission-gated, so a newly registered
 * account that lands there sees the forbidden page instead of the product.
 * A `redirect` query parameter always wins over this fallback.
 */
const DEFAULT_AUTHENTICATED_HOME_PATH = '/';
/**
 * Hosted app hand-off page. It is reached only after the browser completed an
 * authorization that started in a native application, so the visitor is
 * always authenticated here and the page must render instead of bouncing the
 * browser to the portal home — the deep link back into the app never fires
 * otherwise.
 */
const APP_HANDOFF_PATH = '/auth/desktop/launch';

export const PROTECTED_PORTAL_ROUTE_PREFIXES = [
  '/console',
  '/admin',
  '/playground',
  '/c',
  '/partner-join/apply',
  '/partner-join/status',
] as const;

export function isProtectedPortalPath(pathname: string): boolean {
  const normalized = normalizePortalPathname(pathname);
  return PROTECTED_PORTAL_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function hasPortalIamSession(): boolean {
  return isSdkworkIamSessionAuthenticated(loadStoredAppSessionToken());
}

export function hasStoredPortalSession(): boolean {
  return hasPortalIamSession();
}

export function isPortalAuthRoute(pathname: string): boolean {
  const normalized = normalizePortalPathname(pathname);
  return normalized === AUTH_BASE_PATH || normalized.startsWith(`${AUTH_BASE_PATH}/`);
}

/**
 * Whether a path is the hosted sign-out page.
 *
 * It lives under the auth base path but is not an anonymous-only route: the
 * visitor is signed in when they arrive, and the page ends that session.
 * @param pathname - browser pathname.
 * @returns true for the sign-out page.
 */
export function isPortalSignOutPath(pathname: string): boolean {
  const normalized = normalizePortalPathname(pathname);
  return normalized === PORTAL_AUTH_SIGN_OUT_PATH
    || normalized.startsWith(`${PORTAL_AUTH_SIGN_OUT_PATH}/`);
}

/**
 * Whether a path is the hosted app hand-off page that fires the deep link back
 * into a native application.
 *
 * It lives under the auth base path but is not an anonymous auth route: the
 * browser has just signed in, and redirecting the authenticated visitor away
 * would drop the authorization code before the operating system receives it.
 * @param pathname - browser pathname.
 * @returns true for the hand-off page.
 */
export function isPortalAppHandoffPath(pathname: string): boolean {
  const normalized = normalizePortalPathname(pathname);
  return normalized === APP_HANDOFF_PATH || normalized.startsWith(`${APP_HANDOFF_PATH}/`);
}

/**
 * Whether an auth-area URL carries the sign-in state the IAM server issued to
 * a browser login a native application started.
 *
 * The hosted login page must complete that pending request and only then hand
 * the deep link back to the app; redirecting the visitor away drops the
 * one-time code and leaves the desktop app waiting.
 * @param search - the current location search, with or without a leading `?`.
 * @returns true when the sign-in state parameter is present and non-blank.
 */
export function hasPortalOAuthSignInState(
  search: string | null | undefined,
): boolean {
  const normalized = (search ?? '').replace(/^\?/u, '');
  if (normalized === '') {
    return false;
  }
  const state = new URLSearchParams(normalized).get(PORTAL_OAUTH_SIGN_IN_STATE_PARAM);
  return (state ?? '').trim() !== '';
}

/**
 * Whether an authenticated visitor must stay on the current auth route to
 * finish the native-application sign-in hand-off.
 *
 * Two routes qualify: the login-success hand-off page itself, and the hosted
 * login page when it carries the IAM-issued sign-in state (the visitor may
 * already hold a portal session, and the pending request still has to be
 * completed before leaving the auth surface).
 * @param location - browser location inside the auth area.
 * @returns true when the guard must render the auth surface instead of redirecting.
 */
export function isPortalAppSignInHandoff(
  location: PortalAuthLocationLike,
): boolean {
  return isPortalAppHandoffPath(location.pathname)
    || hasPortalOAuthSignInState(location.search);
}

export function buildPortalAuthLoginRedirect(location: PortalAuthLocationLike): string {
  if (isPortalAuthRoute(location.pathname)) {
    // Already on the auth surface: never wrap the whole current URL again,
    // or the `redirect` param nests one level deeper on every bounce until
    // the URL grows without bound. Reuse the existing return target verbatim
    // when present; otherwise redirect to the plain login path.
    const existing = /[?&]redirect=([^&]*)/u.exec(location.search ?? '')?.[1];
    return existing ? `${AUTH_LOGIN_PATH}?redirect=${existing}` : AUTH_LOGIN_PATH;
  }
  const returnPath = `${normalizePortalPathname(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

/**
 * Decodes a redirect target until no percent-escapes remain (bounded so a
 * pathological value cannot loop forever). Used for safety checks only:
 * deeply nested `redirect=/auth/login?redirect=...` values must be rejected
 * as auth routes no matter how many times they were encoded.
 */
function decodePortalRedirectTargetBounded(value: string): string {
  let decoded = value;
  for (let i = 0; i < 8; i += 1) {
    let next = decoded;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (next === decoded) {
      break;
    }
    decoded = next;
  }
  return decoded;
}

export function sanitizePortalAuthRedirect(
  value: string | null | undefined,
  homePath = DEFAULT_HOME_PATH,
): string {
  if (!value) {
    return normalizePortalPathname(homePath);
  }

  let decoded = value;
  let fullyDecoded = value;
  try {
    decoded = decodeURIComponent(value);
    fullyDecoded = decodePortalRedirectTargetBounded(value);
  } catch {
    return normalizePortalPathname(homePath);
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return normalizePortalPathname(homePath);
  }
  if (!fullyDecoded.startsWith('/') || fullyDecoded.startsWith('//')) {
    return normalizePortalPathname(homePath);
  }

  const redirectUrl = new URL(decoded, 'http://sdkwork-cloudrouter.local');
  // Check the fully decoded pathname too: the browser already decoded the
  // query value once, so a nested `redirect=/auth/login?redirect=...` may
  // still be percent-encoded after the single decode above.
  const redirectUrlFully = new URL(fullyDecoded, 'http://sdkwork-cloudrouter.local');
  if (isPortalAuthRoute(redirectUrl.pathname) || isPortalAuthRoute(redirectUrlFully.pathname)) {
    return normalizePortalPathname(homePath);
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function resolvePortalAuthenticatedAuthRouteRedirect({
  authenticatedHomePath = DEFAULT_AUTHENTICATED_HOME_PATH,
  location,
}: {
  authenticatedHomePath?: string;
  location: PortalAuthLocationLike;
}): string {
  const redirect = new URLSearchParams((location.search ?? '').replace(/^\?/, '')).get('redirect');
  return sanitizePortalAuthRedirect(redirect, authenticatedHomePath);
}

export function resolvePortalLoginRequiredAction({
  hasSession,
  location,
}: {
  hasSession: boolean;
  location: PortalAuthLocationLike;
}): PortalLoginRequiredActionDecision {
  if (hasSession) {
    return { allowed: true };
  }

  return {
    allowed: false,
    redirectTo: buildPortalAuthLoginRedirect(location),
  };
}

export function subscribePortalSessionChange(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(PORTAL_SESSION_CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(PORTAL_SESSION_CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function normalizePortalPathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return DEFAULT_HOME_PATH;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
