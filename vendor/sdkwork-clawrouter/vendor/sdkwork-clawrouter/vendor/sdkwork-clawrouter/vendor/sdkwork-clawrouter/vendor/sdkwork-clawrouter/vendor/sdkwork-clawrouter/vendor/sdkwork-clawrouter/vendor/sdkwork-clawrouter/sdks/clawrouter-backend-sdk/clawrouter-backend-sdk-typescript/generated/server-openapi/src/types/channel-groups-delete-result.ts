import type { AdminDeleteResponse } from './admin-delete-response';

/** Channel groups delete result schema exposed by Claw Router. */
export interface ChannelGroupsDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups delete result. */
  data?: AdminDeleteResponse;
  /** Human-readable response message. */
  msg?: string;
}
