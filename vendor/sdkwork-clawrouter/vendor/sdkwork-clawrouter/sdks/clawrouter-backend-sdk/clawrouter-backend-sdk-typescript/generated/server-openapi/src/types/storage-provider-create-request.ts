import type { JsonValue } from './json-value';

/** Storage provider create request schema exposed by Claw Router. */
export interface StorageProviderCreateRequest {
  [key: string]: JsonValue;
}