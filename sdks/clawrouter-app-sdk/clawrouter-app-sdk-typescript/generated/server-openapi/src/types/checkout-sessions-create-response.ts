import type { CheckoutSessionsCreateResult } from './checkout-sessions-create-result';

export interface CheckoutSessionsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
