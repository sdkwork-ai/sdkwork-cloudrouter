import type { JsonValue } from './json-value';

/** Admin mcp binding create request schema exposed by Claw Router. */
export interface AdminMcpBindingCreateRequest {
  /** Allowed tools field on admin mcp binding create request. */
  allowedTools?: string[];
  /** Denied tools field on admin mcp binding create request. */
  deniedTools?: string[];
  /** Enabled field on admin mcp binding create request. */
  enabled?: boolean;
  /** Owner id field on admin mcp binding create request. */
  ownerId: string;
  /** Owner type field on admin mcp binding create request. */
  ownerType: string;
  /** Policy json field on admin mcp binding create request. */
  policyJson?: Record<string, JsonValue>;
  /** Priority field on admin mcp binding create request. */
  priority?: number;
  /** Server revision id field on admin mcp binding create request. */
  serverRevisionId?: string | null;
  /** Status field on admin mcp binding create request. */
  status?: string;
  /** Tool id field on admin mcp binding create request. */
  toolId?: string | null;
}
