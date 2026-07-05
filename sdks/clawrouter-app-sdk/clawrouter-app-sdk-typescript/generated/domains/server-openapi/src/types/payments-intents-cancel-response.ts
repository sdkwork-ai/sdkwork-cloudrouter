import type { PaymentsIntentsCancelResult } from './payments-intents-cancel-result';

export interface PaymentsIntentsCancelResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
