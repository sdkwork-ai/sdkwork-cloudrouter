import type { PaymentsAttemptsRetrieveResult } from './payments-attempts-retrieve-result';

export interface PaymentsAttemptsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
