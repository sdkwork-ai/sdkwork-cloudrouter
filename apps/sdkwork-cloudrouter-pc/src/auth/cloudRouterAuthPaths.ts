/**
 * CloudRouter auth URL path contract.
 *
 * The hosted auth pages themselves come from the shared SDKWork IAM auth
 * package (`@sdkwork/auth-pc-react`); this application owns the paths they are
 * mounted at and publishes them so other processes — a desktop shell signing
 * the account out, a partner surface linking the login page — can target the
 * same URLs this portal serves.
 */
import {
  PORTAL_AUTH_BASE_PATH,
  PORTAL_AUTH_SIGN_OUT_PATH,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/** Auth base path the hosted IAM routes are mounted at. */
export const CLOUD_ROUTER_AUTH_BASE_PATH = PORTAL_AUTH_BASE_PATH;

/**
 * URL path of the hosted sign-out page.
 *
 * The desktop shells open this page (in the system browser) after their own
 * local sign-out, so the shared SDKWork account session ends in the browser
 * too rather than only inside the application that started the sign-out.
 */
export const CLOUD_ROUTER_SIGN_OUT_PATH = PORTAL_AUTH_SIGN_OUT_PATH;

/**
 * Absolute sign-out URL on one CloudRouter origin.
 * @param origin - portal origin, e.g. `https://router.sdkwork.com`.
 * @returns the absolute sign-out URL.
 */
export function buildCloudRouterSignOutUrl(origin: string): string {
  return `${origin.trim().replace(/\/+$/u, '')}${CLOUD_ROUTER_SIGN_OUT_PATH}`;
}
