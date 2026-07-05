import type { InvoicesCancellationsCreateResult } from './invoices-cancellations-create-result';

export interface InvoicesCancellationsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
