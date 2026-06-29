import type { AfterSalesManagementRetrieveResult } from './after-sales-management-retrieve-result';

export interface AfterSalesManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
