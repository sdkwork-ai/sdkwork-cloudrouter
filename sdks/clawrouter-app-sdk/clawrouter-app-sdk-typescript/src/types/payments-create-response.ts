import type { PaymentsCreateResult } from './payments-create-result';

export interface PaymentsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
