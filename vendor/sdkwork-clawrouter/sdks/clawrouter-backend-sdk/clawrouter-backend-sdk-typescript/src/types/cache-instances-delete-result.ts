import type { AdminCacheOperationResponse } from './admin-cache-operation-response';

/** Cache instances delete result schema exposed by Claw Router. */
export interface CacheInstancesDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on cache instances delete result. */
  data?: AdminCacheOperationResponse;
  /** Human-readable response message. */
  msg?: string;
}
