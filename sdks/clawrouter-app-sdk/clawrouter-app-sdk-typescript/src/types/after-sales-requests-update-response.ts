import type { AfterSalesRequestsUpdateResult } from './after-sales-requests-update-result';

export interface AfterSalesRequestsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
