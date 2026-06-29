import type { RefundsRetrieveResult } from './refunds-retrieve-result';

export interface RefundsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
