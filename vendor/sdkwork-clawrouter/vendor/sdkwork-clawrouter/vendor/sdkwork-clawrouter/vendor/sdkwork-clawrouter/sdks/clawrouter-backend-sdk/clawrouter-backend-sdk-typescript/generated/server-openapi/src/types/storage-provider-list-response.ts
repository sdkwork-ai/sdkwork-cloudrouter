import type { JsonValue } from './json-value';

/** Storage provider list response schema exposed by Claw Router. */
export interface StorageProviderListResponse {
  /** Items field on storage provider list response. */
  items: Record<string, JsonValue>[];
}
