import type { AdminReferralStrategy } from './admin-referral-strategy';
import type { PageInfo } from './page-info';

/** Admin referral strategy list response schema exposed by Cloud Router. */
export interface AdminReferralStrategyListResponse {
  /** Items field on admin referral strategy list response. */
  items: AdminReferralStrategy[];
  /** Page info field on admin referral strategy list response. */
  pageInfo: PageInfo;
}
