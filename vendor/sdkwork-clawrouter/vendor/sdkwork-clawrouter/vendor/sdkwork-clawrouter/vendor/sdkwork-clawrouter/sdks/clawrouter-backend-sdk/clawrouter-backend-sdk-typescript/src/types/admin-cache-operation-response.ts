/** Admin cache operation response schema exposed by Claw Router. */
export interface AdminCacheOperationResponse {
  /** Cache key field on admin cache operation response. */
  cacheKey?: string | null;
  /** Deleted entries field on admin cache operation response. */
  deletedEntries: string;
  /** Instance name field on admin cache operation response. */
  instanceName?: string | null;
  /** Namespace field on admin cache operation response. */
  namespace?: string | null;
  /** Operation field on admin cache operation response. */
  operation: string;
  /** Refreshed entries field on admin cache operation response. */
  refreshedEntries: string;
  /** Status field on admin cache operation response. */
  status: string;
}
