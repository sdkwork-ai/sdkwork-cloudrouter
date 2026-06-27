import { hasPermissionInScope } from '@sdkwork/iam-contracts';

import { loadStoredAppSessionToken } from './app-session-token.ts';

const LEGACY_PERMISSION_CODE_REPLACEMENTS: Readonly<Record<string, string>> = {
  'clawrouter:console': 'clawrouter.console.access',
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
    hasPortalPermission('clawrouter.admin.access', grantedScope)
    || hasPortalPermission('clawrouter.system.read', grantedScope)
    || hasPermissionInScope(grantedScope, '*')
  );
}
