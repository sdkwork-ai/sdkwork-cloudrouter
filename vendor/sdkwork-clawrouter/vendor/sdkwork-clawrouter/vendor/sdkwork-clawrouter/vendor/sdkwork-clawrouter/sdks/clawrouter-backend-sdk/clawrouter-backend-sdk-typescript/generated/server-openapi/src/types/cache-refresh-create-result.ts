import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache refresh create result schema exposed by Claw Router. */
export interface CacheRefreshCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on cache refresh create result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
