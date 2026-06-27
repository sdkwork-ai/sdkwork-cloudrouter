import type { JsonValue } from './json-value';

/** Storage bucket create request schema exposed by Claw Router. */
export interface StorageBucketCreateRequest {
  [key: string]: JsonValue;
}