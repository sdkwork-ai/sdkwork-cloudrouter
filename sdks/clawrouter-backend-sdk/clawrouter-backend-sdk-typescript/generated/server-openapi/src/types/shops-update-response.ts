import type { ShopsUpdateResult } from './shops-update-result';

export interface ShopsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
