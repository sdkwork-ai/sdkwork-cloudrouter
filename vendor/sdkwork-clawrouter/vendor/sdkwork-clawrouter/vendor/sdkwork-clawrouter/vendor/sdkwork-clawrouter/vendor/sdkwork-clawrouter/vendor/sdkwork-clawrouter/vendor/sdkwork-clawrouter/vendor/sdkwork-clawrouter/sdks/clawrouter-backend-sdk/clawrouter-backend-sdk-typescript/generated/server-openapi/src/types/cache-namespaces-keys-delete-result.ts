import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache namespaces keys delete result schema exposed by Claw Router. */
export interface CacheNamespacesKeysDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on cache namespaces keys delete result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
