import type { AdminReferralStatItem } from './admin-referral-stat-item';

/** Admin referral stats response schema exposed by Claw Router. */
export interface AdminReferralStatsResponse {
  /** Items field on admin referral stats response. */
  items: AdminReferralStatItem[];
}
