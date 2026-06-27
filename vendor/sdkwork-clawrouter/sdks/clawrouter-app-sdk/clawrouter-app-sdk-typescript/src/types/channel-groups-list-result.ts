import type { AppChannelGroupListResponse } from './app-channel-group-list-response';

/** Channel groups list result schema exposed by Claw Router. */
export interface ChannelGroupsListResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups list result. */
  data?: AppChannelGroupListResponse;
  /** Human-readable response message. */
  msg?: string;
}
