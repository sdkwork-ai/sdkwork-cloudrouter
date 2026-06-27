import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache namespaces refresh create result schema exposed by Claw Router. */
export interface CacheNamespacesRefreshCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on cache namespaces refresh create result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
