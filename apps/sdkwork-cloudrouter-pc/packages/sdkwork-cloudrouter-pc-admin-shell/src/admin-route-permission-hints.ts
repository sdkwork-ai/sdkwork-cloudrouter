/**
 * Route permission hints for relay-focused admin navigation.
 * Codes reference IMF module catalogs (iam, cloudrouter) — consumers do not redefine catalogs.
 * IAM hints are owned by @sdkwork/cloudrouter-pc-admin-iam/contribution.
 */
import { IAM_ADMIN_PERMISSION_HINTS } from '@sdkwork/cloudrouter-pc-admin-iam/contribution';
import { RTC_ADMIN_PERMISSION_HINTS } from '@sdkwork/cloudrouter-pc-admin-rtc/contribution';
import { TRADE_ADMIN_PERMISSION_HINTS } from '@sdkwork/order-pc-admin-trade/contribution';

export type AdminRoutePermissionHint = {
  pathPrefix: string;
  requiredPermission: string;
};

export const ADMIN_ROUTE_PERMISSION_HINTS: readonly AdminRoutePermissionHint[] = [
  { pathPrefix: '/admin/dashboard', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/upstream', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/settings', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/model', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/record', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/request-log', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/analytics', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/monitor', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/ratelimit', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/service-nodes', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/cache', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/runtime-region', requiredPermission: 'cloudrouter.system.read' },
  { pathPrefix: '/admin/site', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/memberships', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/community', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/recharges', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/marketing', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/partner', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/payments', requiredPermission: 'cloudrouter.admin.access' },
  { pathPrefix: '/admin/storage', requiredPermission: 'cloudrouter.admin.access' },
  ...IAM_ADMIN_PERMISSION_HINTS,
  ...RTC_ADMIN_PERMISSION_HINTS,
  ...TRADE_ADMIN_PERMISSION_HINTS,
  { pathPrefix: '/admin/relay', requiredPermission: 'cloudrouter.gateway.read' },
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
