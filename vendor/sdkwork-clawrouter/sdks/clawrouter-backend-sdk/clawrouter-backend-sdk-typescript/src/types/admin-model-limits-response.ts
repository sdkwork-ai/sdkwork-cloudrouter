import type { AdminRateLimitItem } from './admin-rate-limit-item';

/** Admin model limits response schema exposed by Claw Router. */
export interface AdminModelLimitsResponse {
  /** Items field on admin model limits response. */
  items: AdminRateLimitItem[];
}
