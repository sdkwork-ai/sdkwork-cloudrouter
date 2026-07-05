import type { InvoicesRetrieveResult } from './invoices-retrieve-result';

export interface InvoicesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
