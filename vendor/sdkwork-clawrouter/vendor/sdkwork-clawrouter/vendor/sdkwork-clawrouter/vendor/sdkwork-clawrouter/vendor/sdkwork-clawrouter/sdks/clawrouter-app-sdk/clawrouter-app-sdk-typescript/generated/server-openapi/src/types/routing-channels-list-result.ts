import type { RoutingChannelsResponse } from './routing-channels-response';

/** Routing channels list result schema exposed by Claw Router. */
export interface RoutingChannelsListResult {
  /** Business response code. */
  code: string;
  /** Data field on routing channels list result. */
  data?: RoutingChannelsResponse;
  /** Human-readable response message. */
  msg?: string;
}
