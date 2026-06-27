import type { Location } from "react-router-dom";

import {
  hasSdkworkCommercePcIamSession,
  type SdkworkCommercePcSessionSnapshot,
} from "./bootstrap/sessionStore";

export type SdkworkCommercePcAuthGateDecision =
  | { kind: "product-route" }
  | { kind: "auth-route" }
  | { kind: "redirect"; replace: true; to: string };

const AUTH_BASE_PATH = "/auth";
const AUTH_LOGIN_PATH = "/auth/login";
const DEFAULT_HOME_PATH = "/app/commerce";

export function hasSdkworkCommercePcAuthenticatedSession(
  snapshot: SdkworkCommercePcSessionSnapshot,
): boolean {
  return hasSdkworkCommercePcIamSession(snapshot);
}

export function buildSdkworkCommercePcAuthLoginRedirect(location: Pick<Location, "pathname" | "search" | "hash">): string {
  const returnPath = `${normalizePathname(location.pathname)}${location.search ?? ""}${location.hash ?? ""}`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function sanitizeSdkworkCommercePcAuthRedirect(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_HOME_PATH;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_HOME_PATH;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return DEFAULT_HOME_PATH;
  }

  const redirectUrl = new URL(decoded, "http://sdkwork-commerce.local");
  if (isAuthRoute(redirectUrl.pathname)) {
    return DEFAULT_HOME_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function resolveSdkworkCommercePcAuthGateDecision({
  hasSession,
  homePath = DEFAULT_HOME_PATH,
  location,
}: {
  hasSession: boolean;
  homePath?: string;
  location: Pick<Location, "pathname" | "search" | "hash">;
}): SdkworkCommercePcAuthGateDecision {
  const pathname = normalizePathname(location.pathname);
  if (isAuthRoute(pathname)) {
    if (!hasSession) {
      return { kind: "auth-route" };
    }

    const redirect = new URLSearchParams((location.search ?? "").replace(/^\?/u, "")).get("redirect");
    return {
      kind: "redirect",
      replace: true,
      to: sanitizeSdkworkCommercePcAuthRedirect(redirect) || normalizePathname(homePath),
    };
  }

  if (!hasSession) {
    return {
      kind: "redirect",
      replace: true,
      to: buildSdkworkCommercePcAuthLoginRedirect(location),
    };
  }

  return { kind: "product-route" };
}

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return DEFAULT_HOME_PATH;
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
