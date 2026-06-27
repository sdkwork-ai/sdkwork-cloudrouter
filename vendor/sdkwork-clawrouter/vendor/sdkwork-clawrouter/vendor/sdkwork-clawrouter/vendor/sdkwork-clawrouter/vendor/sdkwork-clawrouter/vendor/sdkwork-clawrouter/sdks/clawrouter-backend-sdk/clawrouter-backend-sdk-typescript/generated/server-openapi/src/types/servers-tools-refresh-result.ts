import type { AdminMcpDiscoveryResponse } from './admin-mcp-discovery-response';

/** Servers tools refresh result schema exposed by Claw Router. */
export interface ServersToolsRefreshResult {
  /** Business response code. */
  code: string;
  /** Data field on servers tools refresh result. */
  data?: AdminMcpDiscoveryResponse;
  /** Human-readable response message. */
  msg?: string;
}
