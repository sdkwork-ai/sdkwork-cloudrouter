import type { RechargesOrdersRetrieveResult } from './recharges-orders-retrieve-result';

export interface RechargesOrdersRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
