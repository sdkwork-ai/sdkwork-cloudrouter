import type { OrdersPaymentSuccessRetrieveResult } from './orders-payment-success-retrieve-result';

export interface OrdersPaymentSuccessRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
