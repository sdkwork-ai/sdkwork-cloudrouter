import type { JsonValue } from './json-value';

/** Storage quota create response schema exposed by Claw Router. */
export interface StorageQuotaCreateResponse {
  [key: string]: JsonValue;
}