import type { PaymentsCheckoutRetrieveResult } from './payments-checkout-retrieve-result';

export interface PaymentsCheckoutRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
