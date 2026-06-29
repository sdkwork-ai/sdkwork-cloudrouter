import type { PaymentsIntentsAttemptsCreateResult } from './payments-intents-attempts-create-result';

export interface PaymentsIntentsAttemptsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
