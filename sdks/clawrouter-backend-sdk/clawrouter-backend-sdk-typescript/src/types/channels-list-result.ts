import type { AdminChannelsResponse } from './admin-channels-response';

/** Channels list result schema exposed by Claw Router. */
export interface ChannelsListResult {
  /** Business response code. */
  code: string;
  /** Data field on channels list result. */
  data?: AdminChannelsResponse;
  /** Human-readable response message. */
  msg?: string;
}
