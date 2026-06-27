import type { AdminChannelGroupItem } from './admin-channel-group-item';

/** Admin channel groups response schema exposed by Claw Router. */
export interface AdminChannelGroupsResponse {
  /** Items field on admin channel groups response. */
  items: AdminChannelGroupItem[];
}
