/**
 * Cloud Router client permission policy.
 *
 * Client roots request the console read surface only. Operator capabilities are
 * served by the backend admin surface (PC only) and MUST NOT be requested by a
 * H5, mini program, Flutter, or Harmony client bootstrap.
 */
export const CLOUDROUTER_CONSOLE_ACCESS_PERMISSION = 'cloudrouter.console.access';

export const CLOUDROUTER_SYSTEM_READ_PERMISSION = 'cloudrouter.system.read';

export const CLOUDROUTER_ADMIN_ACCESS_PERMISSION = 'cloudrouter.admin.access';

/** Scopes every Cloud Router client root may request during bootstrap. */
export const CLOUDROUTER_CLIENT_BOOTSTRAP_SCOPES = [
  CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
  CLOUDROUTER_SYSTEM_READ_PERMISSION,
] as const;

/** Scopes reserved for the desktop/PC backend-admin surface. */
export const CLOUDROUTER_NON_CLIENT_SCOPES = [CLOUDROUTER_ADMIN_ACCESS_PERMISSION] as const;

export function isCloudRouterClientScopeAllowed(scope: string): boolean {
  return !(CLOUDROUTER_NON_CLIENT_SCOPES as readonly string[]).includes(scope);
}

export function filterCloudRouterClientScopes(scope: string): boolean {
  return isCloudRouterClientScopeAllowed(scope);
}
