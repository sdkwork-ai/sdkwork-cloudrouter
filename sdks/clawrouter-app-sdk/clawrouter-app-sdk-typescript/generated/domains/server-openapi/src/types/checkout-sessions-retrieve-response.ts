import type { CheckoutSessionsRetrieveResult } from './checkout-sessions-retrieve-result';

export interface CheckoutSessionsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
