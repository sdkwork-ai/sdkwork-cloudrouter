import type { FulfillmentsUpdateResult } from './fulfillments-update-result';

export interface FulfillmentsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
