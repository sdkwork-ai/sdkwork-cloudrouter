import type { AccountsCurrentSummaryRetrieveResult } from './accounts-current-summary-retrieve-result';

export interface AccountsCurrentSummaryRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
