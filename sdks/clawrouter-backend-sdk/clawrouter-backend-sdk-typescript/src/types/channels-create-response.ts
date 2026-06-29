import type { ChannelsCreateResult } from './channels-create-result';

export interface ChannelsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
