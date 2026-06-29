import type { CacheInstancesRefreshCreateResult } from './cache-instances-refresh-create-result';

export interface CacheInstancesRefreshCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
