/**
 * Route permission hints for relay-focused admin navigation.
 * Codes reference IMF module catalogs (iam, clawrouter) — consumers do not redefine catalogs.
 */
export type AdminRoutePermissionHint = {
  pathPrefix: string;
  requiredPermission: string;
};

export const ADMIN_ROUTE_PERMISSION_HINTS: readonly AdminRoutePermissionHint[] = [
  { pathPrefix: '/admin/dashboard', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/group', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/channel', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/settings', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/model', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/record', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/analytics', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/monitor', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/ratelimit', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/service-nodes', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/cache', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/runtime-region', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/site', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/relay', requiredPermission: 'clawrouter.gateway.read' },
];

export function resolveAdminRoutePermissionHint(path: string): string | undefined {
  let matched: AdminRoutePermissionHint | undefined;
  for (const hint of ADMIN_ROUTE_PERMISSION_HINTS) {
    if (path === hint.pathPrefix || path.startsWith(`${hint.pathPrefix}/`)) {
      if (!matched || hint.pathPrefix.length > matched.pathPrefix.length) {
        matched = hint;
      }
    }
  }
  return matched?.requiredPermission;
}
