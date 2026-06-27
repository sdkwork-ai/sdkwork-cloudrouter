import type { AdminRateLimitMutationResponse } from './admin-rate-limit-mutation-response';

/** Rate limits ip create result schema exposed by Claw Router. */
export interface RateLimitsIpCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limits ip create result. */
  data?: AdminRateLimitMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
