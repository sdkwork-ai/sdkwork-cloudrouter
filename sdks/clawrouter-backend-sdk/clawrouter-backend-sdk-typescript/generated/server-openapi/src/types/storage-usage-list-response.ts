import type { JsonValue } from './json-value';

/** Storage usage list response schema exposed by Claw Router. */
export interface StorageUsageListResponse {
  /** Items field on storage usage list response. */
  items: Record<string, JsonValue>[];
}
