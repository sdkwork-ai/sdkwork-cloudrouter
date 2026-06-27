import type { JsonValue } from './json-value';

/** Storage bucket update request schema exposed by Claw Router. */
export interface StorageBucketUpdateRequest {
  [key: string]: JsonValue;
}