import type { PaymentsProvidersUpdateResult } from './payments-providers-update-result';

export interface PaymentsProvidersUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
