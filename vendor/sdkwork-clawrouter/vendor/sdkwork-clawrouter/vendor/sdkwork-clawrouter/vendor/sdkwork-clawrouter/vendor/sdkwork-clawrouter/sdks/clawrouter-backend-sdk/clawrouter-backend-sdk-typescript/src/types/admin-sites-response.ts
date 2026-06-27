import type { AdminSiteItem } from './admin-site-item';

/** Admin sites response schema exposed by Claw Router. */
export interface AdminSitesResponse {
  /** Items field on admin sites response. */
  items: AdminSiteItem[];
}
