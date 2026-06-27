import { hasPermissionInScope } from '@sdkwork/iam-contracts';

import {
  MCP_ADMIN_PERMISSIONS,
  MCP_ADMIN_ROLES,
  type MCPAdminPermission,
} from './permissions';

const OPERATOR_PERMISSIONS = new Set<MCPAdminPermission>([
  MCP_ADMIN_PERMISSIONS.serverManage,
  MCP_ADMIN_PERMISSIONS.categoryManage,
  MCP_ADMIN_PERMISSIONS.invocationRead,
  MCP_ADMIN_PERMISSIONS.marketplaceRead,
]);

export function hasMcpAdminPermission(input: {
  permission: MCPAdminPermission;
  grantedPermissions: readonly string[];
  roleCodes: readonly string[];
}): boolean {
  if (hasPermissionInScope(input.grantedPermissions, input.permission)) {
    return true;
  }
  if (input.roleCodes.includes(MCP_ADMIN_ROLES.superAdmin)) {
    return true;
  }
  if (
    input.roleCodes.includes(MCP_ADMIN_ROLES.operator) &&
    OPERATOR_PERMISSIONS.has(input.permission)
  ) {
    return true;
  }
  return false;
}

export const MCP_ADMIN_PERMISSION_CATALOG = [
  {
    permission: MCP_ADMIN_PERMISSIONS.serverManage,
    label: 'Manage MCP servers, connectors, and capabilities',
  },
  {
    permission: MCP_ADMIN_PERMISSIONS.categoryManage,
    label: 'Manage MCP marketplace categories',
  },
  {
    permission: MCP_ADMIN_PERMISSIONS.invocationRead,
    label: 'Read MCP invocation audit logs',
  },
  {
    permission: MCP_ADMIN_PERMISSIONS.marketplaceRead,
    label: 'Read MCP marketplace admin metadata',
  },
] as const;
