import { isSdkworkIamSessionAuthenticated } from '@sdkwork/iam-runtime';

import {
  loadStoredAppSessionToken,
} from './app-session-token.ts';
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
 * OAuth namespace. Every route that exists only for an OAuth flow — the
 * native-application login step, its deep-link hand-off, and the provider
 * callback of the website's OAuth client — lives here instead of the account
 * surface above.
 */
const OAUTH_BASE_PATH = '/oauth';
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
 * Whether a path belongs to the OAuth namespace rather than the account
 * surface. The two systems are disjoint, so a return target or guard decision
 * never treats one as the other.
 * @param pathname - browser pathname.
 * @returns true for `/oauth` and anything under it.
 */
export function isPortalOAuthRoute(pathname: string): boolean {
  const normalized = normalizePortalPathname(pathname);
  return normalized === OAUTH_BASE_PATH || normalized.startsWith(`${OAUTH_BASE_PATH}/`);
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
  if (
    isPortalAuthRoute(redirectUrl.pathname)
    || isPortalAuthRoute(redirectUrlFully.pathname)
    // The OAuth namespace is a protocol surface: a return target must never
    // aim at a provider callback, the OAuth login step, or the deep-link
    // hand-off page.
    || isPortalOAuthRoute(redirectUrl.pathname)
    || isPortalOAuthRoute(redirectUrlFully.pathname)
  ) {
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
