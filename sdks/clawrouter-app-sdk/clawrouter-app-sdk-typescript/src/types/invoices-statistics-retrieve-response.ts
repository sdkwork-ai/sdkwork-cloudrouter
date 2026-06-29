import type { InvoicesStatisticsRetrieveResult } from './invoices-statistics-retrieve-result';

export interface InvoicesStatisticsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
