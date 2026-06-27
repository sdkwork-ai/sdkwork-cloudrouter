import type { JsonValue } from './json-value';

/** Admin mcp tool update request schema exposed by Claw Router. */
export interface AdminMcpToolUpdateRequest {
  /** Description field on admin mcp tool update request. */
  description?: string | null;
  /** Enabled field on admin mcp tool update request. */
  enabled?: boolean;
  /** Input schema field on admin mcp tool update request. */
  inputSchema?: Record<string, JsonValue>;
  /** Name field on admin mcp tool update request. */
  name?: string;
  /** Output schema field on admin mcp tool update request. */
  outputSchema?: Record<string, JsonValue>;
  /** Rate limit policy field on admin mcp tool update request. */
  rateLimitPolicy?: Record<string, JsonValue>;
  /** Requires approval field on admin mcp tool update request. */
  requiresApproval?: boolean;
  /** Risk level field on admin mcp tool update request. */
  riskLevel?: string;
  /** Sort weight field on admin mcp tool update request. */
  sortWeight?: number;
  /** Status field on admin mcp tool update request. */
  status?: string;
}
