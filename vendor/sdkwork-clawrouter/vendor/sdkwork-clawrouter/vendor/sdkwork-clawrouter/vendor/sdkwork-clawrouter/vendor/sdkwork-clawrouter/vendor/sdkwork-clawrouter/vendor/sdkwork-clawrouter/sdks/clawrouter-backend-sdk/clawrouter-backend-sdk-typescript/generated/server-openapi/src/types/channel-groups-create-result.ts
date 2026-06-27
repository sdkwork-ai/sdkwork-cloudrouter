import type { AdminChannelGroupMutationResponse } from './admin-channel-group-mutation-response';

/** Channel groups create result schema exposed by Claw Router. */
export interface ChannelGroupsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups create result. */
  data?: AdminChannelGroupMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
