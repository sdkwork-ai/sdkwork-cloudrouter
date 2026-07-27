import type { AppApiKeyItem } from './app-api-key-item';
import type { PageInfo } from './page-info';

/** App api key list response schema exposed by Claw Router. */
export interface AppApiKeyListResponse {
  /** Items field on app api key list response. */
  items: AppApiKeyItem[];
  /** Page info field on app api key list response. */
  pageInfo: PageInfo;
}
