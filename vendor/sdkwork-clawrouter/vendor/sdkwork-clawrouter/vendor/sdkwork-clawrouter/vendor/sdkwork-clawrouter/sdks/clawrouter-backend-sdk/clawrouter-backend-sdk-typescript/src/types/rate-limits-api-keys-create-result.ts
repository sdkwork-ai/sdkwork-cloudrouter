import type { AdminRateLimitMutationResponse } from './admin-rate-limit-mutation-response';

/** Rate limits api keys create result schema exposed by Claw Router. */
export interface RateLimitsApiKeysCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limits api keys create result. */
  data?: AdminRateLimitMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
