/** Admin cache namespace policy schema exposed by Claw Router. */
export interface AdminCacheNamespacePolicy {
  /** Consistency field on admin cache namespace policy. */
  consistency: 'relaxed' | 'bounded_stale' | 'coordination_critical';
  /** Enabled field on admin cache namespace policy. */
  enabled: boolean;
  /** Failure mode field on admin cache namespace policy. */
  failureMode: 'fail_closed' | 'origin_fallback' | 'serve_stale' | 'bypass_cache';
  /** Instance name field on admin cache namespace policy. */
  instanceName: string;
  /** Jitter percent field on admin cache namespace policy. */
  jitterPercent: string;
  /** Namespace field on admin cache namespace policy. */
  namespace: string;
  /** Scope field on admin cache namespace policy. */
  scope: string;
  /** Sensitivity field on admin cache namespace policy. */
  sensitivity: string;
  /** Stale while revalidate seconds field on admin cache namespace policy. */
  staleWhileRevalidateSeconds: string;
  /** Tags field on admin cache namespace policy. */
  tags: string[];
  /** Ttl seconds field on admin cache namespace policy. */
  ttlSeconds: string;
}
