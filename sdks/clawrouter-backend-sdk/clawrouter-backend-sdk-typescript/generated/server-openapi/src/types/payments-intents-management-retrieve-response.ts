import type { PaymentsIntentsManagementRetrieveResult } from './payments-intents-management-retrieve-result';

export interface PaymentsIntentsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
