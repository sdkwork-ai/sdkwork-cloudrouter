import type { AdminMcpHealthCheckResponse } from './admin-mcp-health-check-response';

/** Servers health checks create result schema exposed by Claw Router. */
export interface ServersHealthChecksCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers health checks create result. */
  data?: AdminMcpHealthCheckResponse;
  /** Human-readable response message. */
  msg?: string;
}
