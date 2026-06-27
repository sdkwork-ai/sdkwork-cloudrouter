export const MCP_ADMIN_PERMISSIONS = {
  serverManage: 'mcp.admin.server.manage',
  categoryManage: 'mcp.admin.category.manage',
  invocationRead: 'mcp.admin.invocation.read',
  marketplaceRead: 'mcp.admin.marketplace.read',
  /** Legacy alias retained for existing IAM policy bindings. */
  packageManage: 'mcp.admin.server.manage',
} as const;

export const MCP_ADMIN_ROLES = {
  operator: 'mcp-admin-operator',
  superAdmin: 'mcp-admin-super',
} as const;

export type MCPAdminPermission =
  (typeof MCP_ADMIN_PERMISSIONS)[keyof typeof MCP_ADMIN_PERMISSIONS];
