import type { AdminSiteConnectionCheckResponse } from './admin-site-connection-check-response';

/** Health check create result schema exposed by Claw Router. */
export interface HealthCheckCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on health check create result. */
  data?: AdminSiteConnectionCheckResponse;
  /** Human-readable response message. */
  msg?: string;
}
