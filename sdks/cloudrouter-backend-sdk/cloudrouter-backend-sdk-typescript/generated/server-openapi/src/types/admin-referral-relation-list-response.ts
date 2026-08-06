import type { AdminReferralRelation } from './admin-referral-relation';
import type { PageInfo } from './page-info';

/** Admin referral relation list response schema exposed by Cloud Router. */
export interface AdminReferralRelationListResponse {
  /** Items field on admin referral relation list response. */
  items: AdminReferralRelation[];
  /** Page info field on admin referral relation list response. */
  pageInfo: PageInfo;
}
