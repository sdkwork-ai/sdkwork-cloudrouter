import type { AdminTokenLimitsResponse } from './admin-token-limits-response';

/** Rate limits api keys list result schema exposed by Claw Router. */
export interface RateLimitsApiKeysListResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limits api keys list result. */
  data?: AdminTokenLimitsResponse;
  /** Human-readable response message. */
  msg?: string;
}
