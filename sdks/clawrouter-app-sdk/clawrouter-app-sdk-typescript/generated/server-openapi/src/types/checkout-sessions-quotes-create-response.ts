import type { CheckoutSessionsQuotesCreateResult } from './checkout-sessions-quotes-create-result';

export interface CheckoutSessionsQuotesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
