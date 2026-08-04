import type { AdminReferralStat } from './admin-referral-stat';
import type { PageInfo } from './page-info';

/** Admin referral stat list response schema exposed by Claw Router. */
export interface AdminReferralStatListResponse {
  /** Items field on admin referral stat list response. */
  items: AdminReferralStat[];
  /** Page info field on admin referral stat list response. */
  pageInfo: PageInfo;
}
