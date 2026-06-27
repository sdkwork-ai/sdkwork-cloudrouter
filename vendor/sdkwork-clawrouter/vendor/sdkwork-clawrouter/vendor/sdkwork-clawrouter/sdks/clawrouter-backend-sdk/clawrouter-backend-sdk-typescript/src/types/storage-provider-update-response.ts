import type { JsonValue } from './json-value';

/** Storage provider update response schema exposed by Claw Router. */
export interface StorageProviderUpdateResponse {
  [key: string]: JsonValue;
}