import type { OrdersStatusRetrieveResult } from './orders-status-retrieve-result';

export interface OrdersStatusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
