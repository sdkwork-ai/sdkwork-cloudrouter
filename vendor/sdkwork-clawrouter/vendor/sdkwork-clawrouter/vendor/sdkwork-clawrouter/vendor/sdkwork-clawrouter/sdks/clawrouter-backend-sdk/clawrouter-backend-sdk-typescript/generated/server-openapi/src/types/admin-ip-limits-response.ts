import type { AdminRateLimitItem } from './admin-rate-limit-item';

/** Admin ip limits response schema exposed by Claw Router. */
export interface AdminIpLimitsResponse {
  /** Items field on admin ip limits response. */
  items: AdminRateLimitItem[];
}
