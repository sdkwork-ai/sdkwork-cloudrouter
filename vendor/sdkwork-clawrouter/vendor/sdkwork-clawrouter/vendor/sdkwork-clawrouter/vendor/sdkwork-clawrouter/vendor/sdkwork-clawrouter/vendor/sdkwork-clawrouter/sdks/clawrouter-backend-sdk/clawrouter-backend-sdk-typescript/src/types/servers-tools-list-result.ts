import type { AdminMcpToolListResponse } from './admin-mcp-tool-list-response';

/** Servers tools list result schema exposed by Claw Router. */
export interface ServersToolsListResult {
  /** Business response code. */
  code: string;
  /** Data field on servers tools list result. */
  data?: AdminMcpToolListResponse;
  /** Human-readable response message. */
  msg?: string;
}
