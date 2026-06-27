import type { AdminChannelTestResponse } from './admin-channel-test-response';

/** Channels verify result schema exposed by Claw Router. */
export interface ChannelsVerifyResult {
  /** Business response code. */
  code: string;
  /** Data field on channels verify result. */
  data?: AdminChannelTestResponse;
  /** Human-readable response message. */
  msg?: string;
}
