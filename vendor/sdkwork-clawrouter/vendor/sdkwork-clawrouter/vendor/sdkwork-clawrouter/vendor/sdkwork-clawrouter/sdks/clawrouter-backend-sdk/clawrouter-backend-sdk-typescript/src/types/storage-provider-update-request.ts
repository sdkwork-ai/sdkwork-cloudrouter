import type { JsonValue } from './json-value';

/** Storage provider update request schema exposed by Claw Router. */
export interface StorageProviderUpdateRequest {
  [key: string]: JsonValue;
}