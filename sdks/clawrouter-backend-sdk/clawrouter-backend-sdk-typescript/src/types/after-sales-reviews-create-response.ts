import type { AfterSalesReviewsCreateResult } from './after-sales-reviews-create-result';

export interface AfterSalesReviewsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
