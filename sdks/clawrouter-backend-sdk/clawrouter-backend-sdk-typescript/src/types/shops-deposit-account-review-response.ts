import type { ShopsDepositAccountReviewResult } from './shops-deposit-account-review-result';

export interface ShopsDepositAccountReviewResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
