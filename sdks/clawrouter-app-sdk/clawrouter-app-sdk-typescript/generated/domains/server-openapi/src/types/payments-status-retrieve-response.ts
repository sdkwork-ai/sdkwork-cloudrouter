import type { PaymentsStatusRetrieveResult } from './payments-status-retrieve-result';

export interface PaymentsStatusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
