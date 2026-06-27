import type { AdminIpLimitsResponse } from './admin-ip-limits-response';

/** Rate limits ip list result schema exposed by Claw Router. */
export interface RateLimitsIpListResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limits ip list result. */
  data?: AdminIpLimitsResponse;
  /** Human-readable response message. */
  msg?: string;
}
