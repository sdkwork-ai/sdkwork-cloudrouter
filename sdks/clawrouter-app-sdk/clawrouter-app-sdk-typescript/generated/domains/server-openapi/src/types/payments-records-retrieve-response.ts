import type { PaymentsRecordsRetrieveResult } from './payments-records-retrieve-result';

export interface PaymentsRecordsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
