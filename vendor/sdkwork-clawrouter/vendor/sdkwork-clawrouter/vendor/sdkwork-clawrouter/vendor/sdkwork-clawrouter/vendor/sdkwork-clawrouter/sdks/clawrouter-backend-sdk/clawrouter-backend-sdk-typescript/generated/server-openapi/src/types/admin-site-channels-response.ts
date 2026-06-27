import type { AdminSiteChannelItem } from './admin-site-channel-item';

/** Admin site channels response schema exposed by Claw Router. */
export interface AdminSiteChannelsResponse {
  /** Items field on admin site channels response. */
  items: AdminSiteChannelItem[];
}
