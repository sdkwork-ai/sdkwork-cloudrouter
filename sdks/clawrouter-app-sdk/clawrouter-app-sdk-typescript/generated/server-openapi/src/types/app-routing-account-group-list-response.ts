import type { AppRoutingAccountGroup } from './app-routing-account-group';
import type { PageInfo } from './page-info';

/** App routing account group list response schema exposed by Claw Router. */
export interface AppRoutingAccountGroupListResponse {
  /** Items field on app routing account group list response. */
  items: AppRoutingAccountGroup[];
  /** Page info field on app routing account group list response. */
  pageInfo: PageInfo;
}
