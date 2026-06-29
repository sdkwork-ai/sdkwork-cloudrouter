import type { PaymentsIntentsCreateResult } from './payments-intents-create-result';

export interface PaymentsIntentsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
