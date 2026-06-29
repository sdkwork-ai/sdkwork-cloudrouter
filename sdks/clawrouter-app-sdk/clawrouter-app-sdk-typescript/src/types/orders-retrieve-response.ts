import type { OrdersRetrieveResult } from './orders-retrieve-result';

export interface OrdersRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
