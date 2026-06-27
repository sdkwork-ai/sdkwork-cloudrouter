import type { AdminRateLimitItem } from './admin-rate-limit-item';

/** Admin rate limit mutation response schema exposed by Claw Router. */
export interface AdminRateLimitMutationResponse {
  /** Item field on admin rate limit mutation response. */
  item: AdminRateLimitItem;
}
