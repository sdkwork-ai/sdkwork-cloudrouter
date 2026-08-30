import type { AdminDefaultRegionItem } from './admin-default-region-item';
import type { PageInfo } from './page-info';

/** Admin default region list response schema exposed by Cloud Router. */
export interface AdminDefaultRegionListResponse {
  /** Items field on admin default region list response. */
  items: AdminDefaultRegionItem[];
  /** Page info field on admin default region list response. */
  pageInfo: PageInfo;
}
