import type { InvoicesCreateResult } from './invoices-create-result';

export interface InvoicesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
