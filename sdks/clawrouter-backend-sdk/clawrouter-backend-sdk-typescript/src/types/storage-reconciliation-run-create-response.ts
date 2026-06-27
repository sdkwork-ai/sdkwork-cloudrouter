import type { JsonValue } from './json-value';

/** Storage reconciliation run create response schema exposed by Claw Router. */
export interface StorageReconciliationRunCreateResponse {
  [key: string]: JsonValue;
}