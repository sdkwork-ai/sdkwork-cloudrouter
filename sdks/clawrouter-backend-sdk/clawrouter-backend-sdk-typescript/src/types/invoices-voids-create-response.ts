import type { InvoicesVoidsCreateResult } from './invoices-voids-create-result';

export interface InvoicesVoidsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
