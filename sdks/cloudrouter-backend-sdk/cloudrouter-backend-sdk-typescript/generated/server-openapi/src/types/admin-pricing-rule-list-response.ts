import type { AdminPricingRule } from './admin-pricing-rule';
import type { PageInfo } from './page-info';

/** Admin pricing rule list response schema exposed by Cloud Router. */
export interface AdminPricingRuleListResponse {
  /** Items field on admin pricing rule list response. */
  items: AdminPricingRule[];
  /** Page info field on admin pricing rule list response. */
  pageInfo: PageInfo;
}
