import type { AdminCacheInstance } from './admin-cache-instance';
import type { AdminCacheNamespacePolicy } from './admin-cache-namespace-policy';
import type { AdminCacheSummary } from './admin-cache-summary';

/** Admin cache overview response schema exposed by Claw Router. */
export interface AdminCacheOverviewResponse {
  /** Instances field on admin cache overview response. */
  instances: AdminCacheInstance[];
  /** Namespace policies field on admin cache overview response. */
  namespacePolicies: AdminCacheNamespacePolicy[];
  /** Summary field on admin cache overview response. */
  summary: AdminCacheSummary;
}
