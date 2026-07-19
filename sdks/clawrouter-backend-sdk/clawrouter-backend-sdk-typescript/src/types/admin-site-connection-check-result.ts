/** AdminSiteConnectionCheckResult contract. */
export interface AdminSiteConnectionCheckResult {
  /** checkedAt field on AdminSiteConnectionCheckResult. */
  checkedAt: string;
  /** healthStatus field on AdminSiteConnectionCheckResult. */
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  /** latencyMs field on AdminSiteConnectionCheckResult. */
  latencyMs: number | unknown;
  /** message field on AdminSiteConnectionCheckResult. */
  message: string | unknown;
  /** siteId field on AdminSiteConnectionCheckResult. */
  siteId: string;
  /** status field on AdminSiteConnectionCheckResult. */
  status: 'success' | 'failed';
}
