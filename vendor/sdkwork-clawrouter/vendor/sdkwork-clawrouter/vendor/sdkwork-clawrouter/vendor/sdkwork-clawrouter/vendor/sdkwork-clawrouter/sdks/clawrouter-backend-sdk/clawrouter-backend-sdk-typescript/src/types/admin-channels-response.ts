import type { AdminChannelItem } from './admin-channel-item';

/** Admin channels response schema exposed by Claw Router. */
export interface AdminChannelsResponse {
  /** Items field on admin channels response. */
  items: AdminChannelItem[];
}
