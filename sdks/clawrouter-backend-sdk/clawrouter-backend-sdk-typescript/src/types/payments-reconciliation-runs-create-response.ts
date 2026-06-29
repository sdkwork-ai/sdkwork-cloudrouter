import type { PaymentsReconciliationRunsCreateResult } from './payments-reconciliation-runs-create-result';

export interface PaymentsReconciliationRunsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
