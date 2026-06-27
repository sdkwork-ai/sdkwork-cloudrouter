import type { JsonValue } from './json-value';

/** Admin mcp server revision item schema exposed by Claw Router. */
export interface AdminMcpServerRevisionItem {
  /** Args json field on admin mcp server revision item. */
  argsJson: string[];
  /** Auth type field on admin mcp server revision item. */
  authType: string;
  /** Command field on admin mcp server revision item. */
  command?: string | null;
  /** Config hash field on admin mcp server revision item. */
  configHash: string;
  /** Created at field on admin mcp server revision item. */
  createdAt: string;
  /** Created by field on admin mcp server revision item. */
  createdBy: string;
  /** Deprecated at field on admin mcp server revision item. */
  deprecatedAt?: string | null;
  /** Endpoint url field on admin mcp server revision item. */
  endpointUrl?: string | null;
  /** Env schema field on admin mcp server revision item. */
  envSchema: Record<string, JsonValue>;
  /** Id field on admin mcp server revision item. */
  id: string;
  /** Lifecycle status field on admin mcp server revision item. */
  lifecycleStatus: string;
  /** Organization id field on admin mcp server revision item. */
  organizationId: string;
  /** Published at field on admin mcp server revision item. */
  publishedAt?: string | null;
  /** Retry policy field on admin mcp server revision item. */
  retryPolicy: Record<string, JsonValue>;
  /** Revision no field on admin mcp server revision item. */
  revisionNo: string;
  /** Secret ref field on admin mcp server revision item. */
  secretRef?: string | null;
  /** Server id field on admin mcp server revision item. */
  serverId: string;
  /** Status field on admin mcp server revision item. */
  status: string;
  /** Tenant id field on admin mcp server revision item. */
  tenantId: string;
  /** Timeout ms field on admin mcp server revision item. */
  timeoutMs: number;
  /** Transport field on admin mcp server revision item. */
  transport: string;
  /** Updated at field on admin mcp server revision item. */
  updatedAt: string;
  /** Uuid field on admin mcp server revision item. */
  uuid: string;
}
