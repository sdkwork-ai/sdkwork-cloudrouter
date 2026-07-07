/** Cache overview schema exposed by Claw Router. */
export interface CacheOverview {
  /** Instances field on cache overview. */
  instances: Record<string, unknown>[];
  /** Namespace policies field on cache overview. */
  namespacePolicies: Record<string, unknown>[];
  /** Summary field on cache overview. */
  summary: Record<string, unknown>;
}
