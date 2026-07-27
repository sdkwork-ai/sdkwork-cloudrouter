import type { AppChannelGroup } from './app-channel-group';
import type { PageInfo } from './page-info';

/** App channel group list response schema exposed by Claw Router. */
export interface AppChannelGroupListResponse {
  /** Items field on app channel group list response. */
  items: AppChannelGroup[];
  /** Page info field on app channel group list response. */
  pageInfo: PageInfo;
}
