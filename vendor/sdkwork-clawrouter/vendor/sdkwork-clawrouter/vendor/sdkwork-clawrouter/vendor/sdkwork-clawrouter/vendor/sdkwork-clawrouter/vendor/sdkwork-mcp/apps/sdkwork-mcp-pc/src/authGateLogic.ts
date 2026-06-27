import type { Location } from 'react-router-dom';

import {
  hasSdkworkMCPPcIamSession,
  type SdkworkMCPPcSessionSnapshot,
} from './bootstrap/sessionStore';

export type SdkworkMCPPcAuthGateDecision =
  | { kind: 'product-route' }
  | { kind: 'auth-route' }
  | { kind: 'redirect'; replace: true; to: string };

const AUTH_BASE_PATH = '/auth';
const AUTH_LOGIN_PATH = '/auth/login';
const DEFAULT_HOME_PATH = '/mcp-hub';

const PUBLIC_PATH_PREFIXES = ['/mcp-hub'];

const PROTECTED_PATH_PREFIXES = ['/console', '/admin'];

export function hasSdkworkMCPPcAuthenticatedSession(
  snapshot: SdkworkMCPPcSessionSnapshot,
): boolean {
  return hasSdkworkMCPPcIamSession(snapshot);
}

export function buildSdkworkMCPPcAuthLoginRedirect(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): string {
  const returnPath = `${normalizePathname(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function sanitizeSdkworkMCPPcAuthRedirect(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_HOME_PATH;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_HOME_PATH;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return DEFAULT_HOME_PATH;
  }

  const redirectUrl = new URL(decoded, 'http://sdkwork-mcp.local');
  if (isAuthRoute(redirectUrl.pathname)) {
    return DEFAULT_HOME_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function isSdkworkMCPPcProtectedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function isSdkworkMCPPcPublicPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') {
    return true;
  }
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function resolveSdkworkMCPPcAuthGateDecision({
  hasSession,
  homePath = DEFAULT_HOME_PATH,
  location,
}: {
  hasSession: boolean;
  homePath?: string;
  location: Pick<Location, 'pathname' | 'search' | 'hash'>;
}): SdkworkMCPPcAuthGateDecision {
  const pathname = normalizePathname(location.pathname);

  if (isAuthRoute(pathname)) {
    if (!hasSession) {
      return { kind: 'auth-route' };
    }

    const redirect = new URLSearchParams((location.search ?? '').replace(/^\?/u, '')).get(
      'redirect',
    );
    return {
      kind: 'redirect',
      replace: true,
      to: sanitizeSdkworkMCPPcAuthRedirect(redirect) || normalizePathname(homePath),
    };
  }

  if (!hasSession && isSdkworkMCPPcProtectedPath(pathname)) {
    return {
      kind: 'redirect',
      replace: true,
      to: buildSdkworkMCPPcAuthLoginRedirect(location),
    };
  }

  return { kind: 'product-route' };
}

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return '/';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
