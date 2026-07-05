import type { PaymentsStatisticsRetrieveResult } from './payments-statistics-retrieve-result';

export interface PaymentsStatisticsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
