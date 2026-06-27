import type { JsonValue } from './json-value';

/** Storage default bucket update response schema exposed by Claw Router. */
export interface StorageDefaultBucketUpdateResponse {
  [key: string]: JsonValue;
}