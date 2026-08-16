import type { AdminRateCard } from './admin-rate-card';
import type { PageInfo } from './page-info';

/** Admin rate card list response schema exposed by Cloud Router. */
export interface AdminRateCardListResponse {
  /** Items field on admin rate card list response. */
  items: AdminRateCard[];
  /** Page info field on admin rate card list response. */
  pageInfo: PageInfo;
}
