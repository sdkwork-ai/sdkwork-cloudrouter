import type { AdminChannelGroupChannelBindingsResponse } from './admin-channel-group-channel-bindings-response';

/** Channel groups channel bindings update result schema exposed by Claw Router. */
export interface ChannelGroupsChannelBindingsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups channel bindings update result. */
  data?: AdminChannelGroupChannelBindingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
