import type { JsonValue } from './json-value';

/** Storage garbage collection job list response schema exposed by Claw Router. */
export interface StorageGarbageCollectionJobListResponse {
  /** Items field on storage garbage collection job list response. */
  items: Record<string, JsonValue>[];
}
