import type { AfterSalesRequestsRetrieveResult } from './after-sales-requests-retrieve-result';

export interface AfterSalesRequestsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
