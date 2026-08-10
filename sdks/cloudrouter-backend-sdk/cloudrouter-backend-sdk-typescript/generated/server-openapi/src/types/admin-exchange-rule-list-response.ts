import type { AdminExchangeRule } from './admin-exchange-rule';
import type { PageInfo } from './page-info';

/** Admin exchange rule list response schema exposed by Cloud Router. */
export interface AdminExchangeRuleListResponse {
  /** Items field on admin exchange rule list response. */
  items: AdminExchangeRule[];
  /** Page info field on admin exchange rule list response. */
  pageInfo: PageInfo;
}
