import type { JsonValue } from './json-value';

/** Admin mcp server revision create request schema exposed by Claw Router. */
export interface AdminMcpServerRevisionCreateRequest {
  /** Args json field on admin mcp server revision create request. */
  argsJson?: string[];
  /** Auth type field on admin mcp server revision create request. */
  authType?: string;
  /** Command field on admin mcp server revision create request. */
  command?: string;
  /** Endpoint url field on admin mcp server revision create request. */
  endpointUrl?: string;
  /** Env schema field on admin mcp server revision create request. */
  envSchema?: Record<string, JsonValue>;
  /** Retry policy field on admin mcp server revision create request. */
  retryPolicy?: Record<string, JsonValue>;
  /** Revision no field on admin mcp server revision create request. */
  revisionNo: string;
  /** Secret ref field on admin mcp server revision create request. */
  secretRef?: string;
  /** Timeout ms field on admin mcp server revision create request. */
  timeoutMs?: number;
  /** Transport field on admin mcp server revision create request. */
  transport?: string;
}
