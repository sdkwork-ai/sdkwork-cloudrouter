import type { InvoicesManagementRetrieveResult } from './invoices-management-retrieve-result';

export interface InvoicesManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
