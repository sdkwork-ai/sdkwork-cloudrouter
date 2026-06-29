import type { ShopsCurrentChannelsUpdateResult } from './shops-current-channels-update-result';

export interface ShopsCurrentChannelsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
