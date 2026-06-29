import type { AfterSalesRequestsCreateResult } from './after-sales-requests-create-result';

export interface AfterSalesRequestsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
