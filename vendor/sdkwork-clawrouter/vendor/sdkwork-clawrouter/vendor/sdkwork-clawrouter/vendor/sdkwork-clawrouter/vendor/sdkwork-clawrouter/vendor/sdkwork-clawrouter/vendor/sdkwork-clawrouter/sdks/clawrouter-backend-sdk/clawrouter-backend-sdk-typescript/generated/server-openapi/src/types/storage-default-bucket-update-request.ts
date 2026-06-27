import type { JsonValue } from './json-value';

/** Storage default bucket update request schema exposed by Claw Router. */
export interface StorageDefaultBucketUpdateRequest {
  [key: string]: JsonValue;
}