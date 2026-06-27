import type { AdminSiteConnectionCheckResponse } from './admin-site-connection-check-response';

/** Test connection create result schema exposed by Claw Router. */
export interface TestConnectionCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on test connection create result. */
  data?: AdminSiteConnectionCheckResponse;
  /** Human-readable response message. */
  msg?: string;
}
