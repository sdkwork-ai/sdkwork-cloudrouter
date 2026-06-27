import type { JsonValue } from './json-value';

/** Storage provider create response schema exposed by Claw Router. */
export interface StorageProviderCreateResponse {
  [key: string]: JsonValue;
}