import type { PaymentsCloseResult } from './payments-close-result';

export interface PaymentsCloseResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
