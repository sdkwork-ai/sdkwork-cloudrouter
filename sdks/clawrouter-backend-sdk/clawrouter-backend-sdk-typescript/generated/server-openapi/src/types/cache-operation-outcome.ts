/** Cache operation outcome schema exposed by Claw Router. */
export interface CacheOperationOutcome {
  /** Cache key field on cache operation outcome. */
  cacheKey: string | null;
  /** Deleted entries field on cache operation outcome. */
  deletedEntries: string;
  /** Instance name field on cache operation outcome. */
  instanceName: string | null;
  /** Namespace field on cache operation outcome. */
  namespace: string | null;
  /** Operation field on cache operation outcome. */
  operation: string;
  /** Refreshed entries field on cache operation outcome. */
  refreshedEntries: string;
  /** Status field on cache operation outcome. */
  status: string;
}
