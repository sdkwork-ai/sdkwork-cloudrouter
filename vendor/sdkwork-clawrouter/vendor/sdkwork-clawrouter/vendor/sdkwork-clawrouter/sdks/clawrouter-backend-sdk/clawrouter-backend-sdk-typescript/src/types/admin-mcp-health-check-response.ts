/** Admin mcp health check response schema exposed by Claw Router. */
export interface AdminMcpHealthCheckResponse {
  /** Checked at field on admin mcp health check response. */
  checkedAt: string;
  /** Error masked field on admin mcp health check response. */
  errorMasked?: string | null;
  /** Health status field on admin mcp health check response. */
  healthStatus: string;
  /** Healthy field on admin mcp health check response. */
  healthy: boolean;
  /** Latency ms field on admin mcp health check response. */
  latencyMs?: string | null;
  /** Server id field on admin mcp health check response. */
  serverId: string;
}
