import type { InvoicesIssuancesCreateResult } from './invoices-issuances-create-result';

export interface InvoicesIssuancesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
