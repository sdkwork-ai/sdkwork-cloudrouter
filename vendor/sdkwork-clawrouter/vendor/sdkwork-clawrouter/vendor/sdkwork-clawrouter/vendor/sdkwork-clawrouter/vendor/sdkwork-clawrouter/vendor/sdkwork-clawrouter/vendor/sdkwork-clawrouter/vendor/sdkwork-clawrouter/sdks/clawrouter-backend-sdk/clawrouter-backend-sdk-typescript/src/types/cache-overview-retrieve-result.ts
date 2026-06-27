import type { AdminCacheOverviewResponse } from './admin-cache-overview-response';

/** Cache overview retrieve result schema exposed by Claw Router. */
export interface CacheOverviewRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on cache overview retrieve result. */
  data?: AdminCacheOverviewResponse;
  /** Human-readable response message. */
  msg?: string;
}
