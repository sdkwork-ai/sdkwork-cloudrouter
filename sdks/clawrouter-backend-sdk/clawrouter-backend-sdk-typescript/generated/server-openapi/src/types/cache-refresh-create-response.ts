import type { CacheRefreshCreateResult } from './cache-refresh-create-result';

export interface CacheRefreshCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
