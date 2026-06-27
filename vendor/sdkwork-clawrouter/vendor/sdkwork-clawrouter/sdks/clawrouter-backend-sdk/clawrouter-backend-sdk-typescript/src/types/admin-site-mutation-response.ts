import type { AdminSiteItem } from './admin-site-item';

/** Admin site mutation response schema exposed by Claw Router. */
export interface AdminSiteMutationResponse {
  /** Item field on admin site mutation response. */
  item: AdminSiteItem;
}
