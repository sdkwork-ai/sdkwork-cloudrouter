import type { CacheNamespacesRefreshCreateResult } from './cache-namespaces-refresh-create-result';

export interface CacheNamespacesRefreshCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
