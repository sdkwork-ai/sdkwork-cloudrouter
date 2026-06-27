import type { JsonValue } from './json-value';

/** Admin mcp binding update request schema exposed by Claw Router. */
export interface AdminMcpBindingUpdateRequest {
  /** Allowed tools field on admin mcp binding update request. */
  allowedTools?: string[];
  /** Denied tools field on admin mcp binding update request. */
  deniedTools?: string[];
  /** Enabled field on admin mcp binding update request. */
  enabled?: boolean;
  /** Owner id field on admin mcp binding update request. */
  ownerId?: string;
  /** Owner type field on admin mcp binding update request. */
  ownerType?: string;
  /** Policy json field on admin mcp binding update request. */
  policyJson?: Record<string, JsonValue>;
  /** Priority field on admin mcp binding update request. */
  priority?: number;
  /** Server revision id field on admin mcp binding update request. */
  serverRevisionId?: string | null;
  /** Status field on admin mcp binding update request. */
  status?: string;
  /** Tool id field on admin mcp binding update request. */
  toolId?: string | null;
}
