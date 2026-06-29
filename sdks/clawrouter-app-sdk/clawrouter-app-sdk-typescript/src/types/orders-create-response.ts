import type { OrdersCreateResult } from './orders-create-result';

export interface OrdersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
