import type { JsonValue } from './json-value';

/** Storage bucket list response schema exposed by Claw Router. */
export interface StorageBucketListResponse {
  /** Items field on storage bucket list response. */
  items: Record<string, JsonValue>[];
}
