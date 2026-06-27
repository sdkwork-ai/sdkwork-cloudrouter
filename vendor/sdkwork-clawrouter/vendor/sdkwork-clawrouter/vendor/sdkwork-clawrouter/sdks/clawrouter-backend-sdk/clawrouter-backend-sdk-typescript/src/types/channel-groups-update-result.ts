import type { AdminChannelGroupMutationResponse } from './admin-channel-group-mutation-response';

/** Channel groups update result schema exposed by Claw Router. */
export interface ChannelGroupsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups update result. */
  data?: AdminChannelGroupMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
