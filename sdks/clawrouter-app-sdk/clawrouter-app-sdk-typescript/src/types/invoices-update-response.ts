import type { InvoicesUpdateResult } from './invoices-update-result';

export interface InvoicesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
