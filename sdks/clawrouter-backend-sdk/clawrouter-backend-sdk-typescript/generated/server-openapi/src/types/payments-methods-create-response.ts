import type { PaymentsMethodsCreateResult } from './payments-methods-create-result';

export interface PaymentsMethodsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
