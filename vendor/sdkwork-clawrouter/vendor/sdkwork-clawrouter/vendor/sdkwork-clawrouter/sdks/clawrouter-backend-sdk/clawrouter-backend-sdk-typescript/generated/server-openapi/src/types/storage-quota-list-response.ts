import type { JsonValue } from './json-value';

/** Storage quota list response schema exposed by Claw Router. */
export interface StorageQuotaListResponse {
  /** Items field on storage quota list response. */
  items: Record<string, JsonValue>[];
}
