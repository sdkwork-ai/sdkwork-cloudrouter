import { hasPermissionInScope } from '@sdkwork/iam-contracts';

import { loadStoredAppSessionToken } from './app-session-token.ts';

const LEGACY_PERMISSION_CODE_REPLACEMENTS: Readonly<Record<string, string>> = {
  'cloudrouter:console': 'cloudrouter.console.access',
};

export function normalizePortalPermissionCode(permissionCode: string): string {
  return LEGACY_PERMISSION_CODE_REPLACEMENTS[permissionCode] ?? permissionCode;
}

export function readPortalPermissionScope(): readonly string[] {
  const permissionScope = loadStoredAppSessionToken()?.context?.permissionScope;
  if (!permissionScope?.length) {
    return [];
  }
  return permissionScope.map((code) => normalizePortalPermissionCode(code));
}

/**
 * IAM role codes of the signed-in operator, as IAM resolved them.
 *
 * The admin console filters the AI-foundation catalogs by role, and a catalog
 * record names the roles allowed to see it. The codes therefore come from the
 * session context IAM already resolved for this session — never from a role
 * code the page invents. An unsigned-in or role-less session resolves to an
 * empty list, which callers translate into the catalog's "all data" view.
 */
export function readPortalRoleCodes(): readonly string[] {
  const roleCodes = loadStoredAppSessionToken()?.context?.standardRoleCodes;
  if (!roleCodes?.length) {
    return [];
  }
  return roleCodes
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

export function hasPortalPermission(
  requiredPermission: string,
  grantedScope: readonly string[] = readPortalPermissionScope(),
): boolean {
  return hasPermissionInScope(grantedScope, requiredPermission);
}

export function hasPortalAdminSurfaceAccess(
  grantedScope: readonly string[] = readPortalPermissionScope(),
): boolean {
  return (
    hasPortalPermission('cloudrouter.admin.access', grantedScope)
    || hasPortalPermission('cloudrouter.system.read', grantedScope)
    || hasPermissionInScope(grantedScope, '*')
  );
}
