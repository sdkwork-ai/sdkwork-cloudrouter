import type { JsonValue } from './json-value';

/** CacheOverview contract. */
export interface CacheOverview {
  /** instances field on CacheOverview. */
  instances: Record<string, JsonValue>[];
  /** namespacePolicies field on CacheOverview. */
  namespacePolicies: Record<string, JsonValue>[];
  /** summary field on CacheOverview. */
  summary: Record<string, JsonValue>;
}
