import type { RoutingChannelItem } from './routing-channel-item';

/** Routing channels response schema exposed by Claw Router. */
export interface RoutingChannelsResponse {
  /** Items field on routing channels response. */
  items: RoutingChannelItem[];
}
