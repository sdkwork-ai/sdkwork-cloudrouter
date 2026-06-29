import type { CheckoutSessionsOrdersCreateResult } from './checkout-sessions-orders-create-result';

export interface CheckoutSessionsOrdersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
