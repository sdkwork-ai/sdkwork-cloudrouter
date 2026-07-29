import type { AppRoutingApiKey } from './app-routing-api-key';
import type { PageInfo } from './page-info';

/** App routing api key list response schema exposed by Claw Router. */
export interface AppRoutingApiKeyListResponse {
  /** Items field on app routing api key list response. */
  items: AppRoutingApiKey[];
  /** Page info field on app routing api key list response. */
  pageInfo: PageInfo;
}
