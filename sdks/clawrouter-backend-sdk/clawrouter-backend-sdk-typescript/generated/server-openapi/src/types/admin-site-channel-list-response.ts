import type { AdminSiteChannelItem } from './admin-site-channel-item';
import type { PageInfo } from './page-info';

/** Admin site channel list response schema exposed by Claw Router. */
export interface AdminSiteChannelListResponse {
  /** Items field on admin site channel list response. */
  items: AdminSiteChannelItem[];
  /** Page info field on admin site channel list response. */
  pageInfo: PageInfo;
}
