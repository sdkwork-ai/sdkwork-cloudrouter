import type { JsonValue } from './json-value';

/** Storage default bucket list response schema exposed by Claw Router. */
export interface StorageDefaultBucketListResponse {
  /** Items field on storage default bucket list response. */
  items: Record<string, JsonValue>[];
}
