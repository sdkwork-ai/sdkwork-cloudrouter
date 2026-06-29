import type { ShopsSubmitReviewResult } from './shops-submit-review-result';

export interface ShopsSubmitReviewResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
