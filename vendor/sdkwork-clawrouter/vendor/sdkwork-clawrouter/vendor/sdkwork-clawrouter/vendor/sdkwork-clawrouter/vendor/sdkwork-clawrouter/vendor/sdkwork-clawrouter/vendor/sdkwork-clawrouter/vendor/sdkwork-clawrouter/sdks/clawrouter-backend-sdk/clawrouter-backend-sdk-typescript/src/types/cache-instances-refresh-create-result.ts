import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache instances refresh create result schema exposed by Claw Router. */
export interface CacheInstancesRefreshCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on cache instances refresh create result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
