import type { PaymentsRuntimeSnapshotRetrieveResult } from './payments-runtime-snapshot-retrieve-result';

export interface PaymentsRuntimeSnapshotRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
