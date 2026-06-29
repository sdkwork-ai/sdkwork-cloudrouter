import type { CommerceReportsPaymentReconciliationRetrieveResult } from './commerce-reports-payment-reconciliation-retrieve-result';

export interface CommerceReportsPaymentReconciliationRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
