/**
 * Inherited route permission hints for admin navigation.
 * Codes reference IMF module catalogs (iam, commerce, clawrouter) — consumers do not redefine catalogs.
 * See APP_PERMISSION_COMPOSITION_SPEC.md and specs/dependency.composition.json permissionComposition.
 */
export type AdminRoutePermissionHint = {
  pathPrefix: string;
  requiredPermission: string;
};

export const ADMIN_ROUTE_PERMISSION_HINTS: readonly AdminRoutePermissionHint[] = [
  { pathPrefix: '/admin/dashboard', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/user', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/organization', requiredPermission: 'iam.organizations.read' },
  { pathPrefix: '/admin/group', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/channel', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/oauth', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/settings', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/model', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/agents', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/skill', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/prompts', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/mcp', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/record', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/analytics', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/announcement', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/catalog', requiredPermission: 'commerce.catalog.read' },
  { pathPrefix: '/admin/inventory', requiredPermission: 'commerce.inventory.read' },
  { pathPrefix: '/admin/orders', requiredPermission: 'commerce.orders.read' },
  { pathPrefix: '/admin/payments', requiredPermission: 'commerce.payments.read' },
  { pathPrefix: '/admin/marketing', requiredPermission: 'commerce.marketing.read' },
  { pathPrefix: '/admin/wallet', requiredPermission: 'commerce.payments.read' },
  { pathPrefix: '/admin/finance', requiredPermission: 'finance.revenue.read' },
  { pathPrefix: '/admin/storage', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/drive', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/monitor', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/ratelimit', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/service-nodes', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/cache', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/runtime-region', requiredPermission: 'clawrouter.system.read' },
  { pathPrefix: '/admin/site', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/messaging', requiredPermission: 'clawrouter.admin.access' },
  { pathPrefix: '/admin/service-providers', requiredPermission: 'clawrouter.admin.access' },
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
