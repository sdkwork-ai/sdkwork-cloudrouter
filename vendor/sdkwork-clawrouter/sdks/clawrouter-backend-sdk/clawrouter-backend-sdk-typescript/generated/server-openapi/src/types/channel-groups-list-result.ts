import type { AdminChannelGroupsResponse } from './admin-channel-groups-response';

/** Channel groups list result schema exposed by Claw Router. */
export interface ChannelGroupsListResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups list result. */
  data?: AdminChannelGroupsResponse;
  /** Human-readable response message. */
  msg?: string;
}
