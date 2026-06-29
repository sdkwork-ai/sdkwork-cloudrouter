import type { PaymentsIntentsRetrieveResult } from './payments-intents-retrieve-result';

export interface PaymentsIntentsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
