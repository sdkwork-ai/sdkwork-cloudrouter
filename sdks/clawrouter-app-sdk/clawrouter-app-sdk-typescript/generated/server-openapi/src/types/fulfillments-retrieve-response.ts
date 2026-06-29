import type { FulfillmentsRetrieveResult } from './fulfillments-retrieve-result';

export interface FulfillmentsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
