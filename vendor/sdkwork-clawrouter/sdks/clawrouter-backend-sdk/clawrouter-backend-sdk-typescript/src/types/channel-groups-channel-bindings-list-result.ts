import type { AdminChannelGroupChannelBindingsResponse } from './admin-channel-group-channel-bindings-response';

/** Channel groups channel bindings list result schema exposed by Claw Router. */
export interface ChannelGroupsChannelBindingsListResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups channel bindings list result. */
  data?: AdminChannelGroupChannelBindingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
