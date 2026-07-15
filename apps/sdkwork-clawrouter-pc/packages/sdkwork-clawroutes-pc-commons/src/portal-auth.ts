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
const DEFAULT_AUTHENTICATED_HOME_PATH = '/admin';

export const PROTECTED_PORTAL_ROUTE_PREFIXES = ['/console', '/admin'] as const;

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

export function buildPortalAuthLoginRedirect(location: PortalAuthLocationLike): string {
  const returnPath = `${normalizePortalPathname(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function sanitizePortalAuthRedirect(
  value: string | null | undefined,
  homePath = DEFAULT_HOME_PATH,
): string {
  if (!value) {
    return normalizePortalPathname(homePath);
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return normalizePortalPathname(homePath);
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return normalizePortalPathname(homePath);
  }

  const redirectUrl = new URL(decoded, 'http://sdkwork-clawrouter.local');
  if (isPortalAuthRoute(redirectUrl.pathname)) {
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
