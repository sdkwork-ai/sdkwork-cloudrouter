import type { AdminMcpServerListResponse } from './admin-mcp-server-list-response';

/** Servers list result schema exposed by Claw Router. */
export interface ServersListResult {
  /** Business response code. */
  code: string;
  /** Data field on servers list result. */
  data?: AdminMcpServerListResponse;
  /** Human-readable response message. */
  msg?: string;
}
