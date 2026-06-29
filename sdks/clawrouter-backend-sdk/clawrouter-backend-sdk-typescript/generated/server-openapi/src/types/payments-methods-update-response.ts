import type { PaymentsMethodsUpdateResult } from './payments-methods-update-result';

export interface PaymentsMethodsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
