import type { JsonValue } from './json-value';

/** Storage quota create request schema exposed by Claw Router. */
export interface StorageQuotaCreateRequest {
  [key: string]: JsonValue;
}