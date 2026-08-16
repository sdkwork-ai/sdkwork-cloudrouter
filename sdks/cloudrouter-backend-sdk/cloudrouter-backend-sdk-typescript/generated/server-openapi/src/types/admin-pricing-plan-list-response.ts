import type { AdminPricingPlan } from './admin-pricing-plan';
import type { PageInfo } from './page-info';

/** Admin pricing plan list response schema exposed by Cloud Router. */
export interface AdminPricingPlanListResponse {
  /** Items field on admin pricing plan list response. */
  items: AdminPricingPlan[];
  /** Page info field on admin pricing plan list response. */
  pageInfo: PageInfo;
}
