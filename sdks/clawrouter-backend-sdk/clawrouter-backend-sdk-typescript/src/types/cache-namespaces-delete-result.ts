import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache namespaces delete result schema exposed by Claw Router. */
export interface CacheNamespacesDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on cache namespaces delete result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
