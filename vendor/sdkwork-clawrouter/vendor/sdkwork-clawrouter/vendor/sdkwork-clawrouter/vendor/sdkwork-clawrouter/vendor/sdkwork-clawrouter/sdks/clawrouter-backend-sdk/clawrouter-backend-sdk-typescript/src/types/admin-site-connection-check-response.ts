/** Admin site connection check response schema exposed by Claw Router. */
export interface AdminSiteConnectionCheckResponse {
  /** Checked at field on admin site connection check response. */
  checkedAt: string;
  /** Health status field on admin site connection check response. */
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  /** Latency ms field on admin site connection check response. */
  latencyMs?: string | null;
  /** Message field on admin site connection check response. */
  message?: string | null;
  /** Site id field on admin site connection check response. */
  siteId: string;
  /** Status field on admin site connection check response. */
  status: 'success' | 'failed';
}
