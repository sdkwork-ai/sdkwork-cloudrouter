import type { AdminChannelVerifyResult } from './admin-channel-verify-result';

/** Channels verify result schema exposed by Claw Router. */
export interface ChannelsVerifyResult {
  code: 0;
  data: unknown & AdminChannelVerifyResult;
  /** Server-owned request correlation id. */
  traceId: string;
}
