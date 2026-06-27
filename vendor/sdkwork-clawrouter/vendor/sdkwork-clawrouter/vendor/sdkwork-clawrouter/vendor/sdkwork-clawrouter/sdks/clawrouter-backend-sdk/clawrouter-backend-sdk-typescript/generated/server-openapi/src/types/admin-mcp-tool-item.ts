import type { JsonValue } from './json-value';

/** Admin mcp tool item schema exposed by Claw Router. */
export interface AdminMcpToolItem {
  /** Created at field on admin mcp tool item. */
  createdAt: string;
  /** Description field on admin mcp tool item. */
  description?: string | null;
  /** Discovered at field on admin mcp tool item. */
  discoveredAt?: string | null;
  /** Enabled field on admin mcp tool item. */
  enabled: boolean;
  /** Id field on admin mcp tool item. */
  id: string;
  /** Input schema field on admin mcp tool item. */
  inputSchema: Record<string, JsonValue>;
  /** Last invoked at field on admin mcp tool item. */
  lastInvokedAt?: string | null;
  /** Name field on admin mcp tool item. */
  name: string;
  /** Organization id field on admin mcp tool item. */
  organizationId: string;
  /** Output schema field on admin mcp tool item. */
  outputSchema: Record<string, JsonValue>;
  /** Rate limit policy field on admin mcp tool item. */
  rateLimitPolicy: Record<string, JsonValue>;
  /** Requires approval field on admin mcp tool item. */
  requiresApproval: boolean;
  /** Risk level field on admin mcp tool item. */
  riskLevel: string;
  /** Schema hash field on admin mcp tool item. */
  schemaHash: string;
  /** Server id field on admin mcp tool item. */
  serverId: string;
  /** Server revision id field on admin mcp tool item. */
  serverRevisionId?: string | null;
  /** Sort weight field on admin mcp tool item. */
  sortWeight: number;
  /** Status field on admin mcp tool item. */
  status: string;
  /** Tenant id field on admin mcp tool item. */
  tenantId: string;
  /** Tool key field on admin mcp tool item. */
  toolKey: string;
  /** Updated at field on admin mcp tool item. */
  updatedAt: string;
  /** Uuid field on admin mcp tool item. */
  uuid: string;
}
