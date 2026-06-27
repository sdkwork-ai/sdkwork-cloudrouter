import type { AdminRateLimitMutationResponse } from './admin-rate-limit-mutation-response';

/** Rate limits models create result schema exposed by Claw Router. */
export interface RateLimitsModelsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limits models create result. */
  data?: AdminRateLimitMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
