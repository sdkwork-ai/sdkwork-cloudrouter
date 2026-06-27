import type { JsonValue } from './json-value';

/** Storage bucket update response schema exposed by Claw Router. */
export interface StorageBucketUpdateResponse {
  [key: string]: JsonValue;
}