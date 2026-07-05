import type { InvoicesSubmissionsCreateResult } from './invoices-submissions-create-result';

export interface InvoicesSubmissionsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
