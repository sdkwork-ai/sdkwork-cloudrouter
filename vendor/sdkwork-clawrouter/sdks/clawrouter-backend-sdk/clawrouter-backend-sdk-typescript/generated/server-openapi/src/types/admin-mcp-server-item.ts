/** Admin mcp server item schema exposed by Claw Router. */
export interface AdminMcpServerItem {
  /** Category code field on admin mcp server item. */
  categoryCode?: string | null;
  /** Category id field on admin mcp server item. */
  categoryId?: string | null;
  /** Created at field on admin mcp server item. */
  createdAt: string;
  /** Deprecated at field on admin mcp server item. */
  deprecatedAt?: string | null;
  /** Description field on admin mcp server item. */
  description?: string | null;
  /** Health status field on admin mcp server item. */
  healthStatus: string;
  /** Id field on admin mcp server item. */
  id: string;
  /** Last checked at field on admin mcp server item. */
  lastCheckedAt?: string | null;
  /** Last error masked field on admin mcp server item. */
  lastErrorMasked?: string | null;
  /** Latest revision id field on admin mcp server item. */
  latestRevisionId?: string | null;
  /** Name field on admin mcp server item. */
  name: string;
  /** Organization id field on admin mcp server item. */
  organizationId: string;
  /** Owner user id field on admin mcp server item. */
  ownerUserId?: string | null;
  /** Published at field on admin mcp server item. */
  publishedAt?: string | null;
  /** Published revision id field on admin mcp server item. */
  publishedRevisionId?: string | null;
  /** Server key field on admin mcp server item. */
  serverKey: string;
  /** Status field on admin mcp server item. */
  status: string;
  /** Tags field on admin mcp server item. */
  tags: string[];
  /** Tenant id field on admin mcp server item. */
  tenantId: string;
  /** Transport field on admin mcp server item. */
  transport: string;
  /** Updated at field on admin mcp server item. */
  updatedAt: string;
  /** Uuid field on admin mcp server item. */
  uuid: string;
  /** Visibility field on admin mcp server item. */
  visibility: string;
}
