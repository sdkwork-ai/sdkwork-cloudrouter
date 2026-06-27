import type { AdminRateLimitItem } from './admin-rate-limit-item';

/** Admin token limits response schema exposed by Claw Router. */
export interface AdminTokenLimitsResponse {
  /** Items field on admin token limits response. */
  items: AdminRateLimitItem[];
}
