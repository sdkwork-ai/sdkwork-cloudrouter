import type { AdminSiteItem } from './admin-site-item';
import type { PageInfo } from './page-info';

/** Admin site list response schema exposed by Claw Router. */
export interface AdminSiteListResponse {
  /** Items field on admin site list response. */
  items: AdminSiteItem[];
  /** Page info field on admin site list response. */
  pageInfo: PageInfo;
}
