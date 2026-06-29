import type { ChannelsVerifyResult } from './channels-verify-result';

export interface ChannelsVerifyResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
