import type { AdminReferralStatsResponse } from './admin-referral-stats-response';

/** Marketing referral stats list result schema exposed by Claw Router. */
export interface MarketingReferralStatsListResult {
  /** Business response code. */
  code: string;
  /** Data field on marketing referral stats list result. */
  data?: AdminReferralStatsResponse;
  /** Human-readable response message. */
  msg?: string;
}
