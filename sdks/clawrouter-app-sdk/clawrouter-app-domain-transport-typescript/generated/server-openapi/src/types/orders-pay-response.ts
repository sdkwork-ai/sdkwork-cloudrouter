import type { OrdersPayResult } from './orders-pay-result';

export interface OrdersPayResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
