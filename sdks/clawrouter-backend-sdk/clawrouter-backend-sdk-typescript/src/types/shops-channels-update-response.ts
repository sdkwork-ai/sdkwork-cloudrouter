import type { ShopsChannelsUpdateResult } from './shops-channels-update-result';

export interface ShopsChannelsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
