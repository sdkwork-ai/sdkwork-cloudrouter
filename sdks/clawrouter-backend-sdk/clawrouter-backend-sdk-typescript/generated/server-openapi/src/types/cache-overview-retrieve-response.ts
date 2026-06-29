import type { CacheOverviewRetrieveResult } from './cache-overview-retrieve-result';

export interface CacheOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
