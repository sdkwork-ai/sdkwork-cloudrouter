import type { AdminCacheKeyListResponse } from './admin-cache-key-list-response';

/** Cache namespaces keys list result schema exposed by Claw Router. */
export interface CacheNamespacesKeysListResult {
  /** Business response code. */
  code: string;
  /** Data field on cache namespaces keys list result. */
  data?: AdminCacheKeyListResponse;
  /** Human-readable response message. */
  msg?: string;
}
