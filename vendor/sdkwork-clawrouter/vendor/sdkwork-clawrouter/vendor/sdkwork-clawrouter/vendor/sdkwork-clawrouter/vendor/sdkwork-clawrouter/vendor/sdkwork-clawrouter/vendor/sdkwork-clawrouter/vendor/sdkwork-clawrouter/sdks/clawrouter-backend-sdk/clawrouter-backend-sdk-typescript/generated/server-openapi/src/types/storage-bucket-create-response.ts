import type { JsonValue } from './json-value';

/** Storage bucket create response schema exposed by Claw Router. */
export interface StorageBucketCreateResponse {
  [key: string]: JsonValue;
}