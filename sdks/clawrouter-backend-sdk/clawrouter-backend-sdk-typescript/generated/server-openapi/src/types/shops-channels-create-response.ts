import type { ShopsChannelsCreateResult } from './shops-channels-create-result';

export interface ShopsChannelsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
