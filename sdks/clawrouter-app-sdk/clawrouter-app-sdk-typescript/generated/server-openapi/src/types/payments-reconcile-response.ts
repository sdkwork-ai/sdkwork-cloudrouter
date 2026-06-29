import type { PaymentsReconcileResult } from './payments-reconcile-result';

export interface PaymentsReconcileResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
