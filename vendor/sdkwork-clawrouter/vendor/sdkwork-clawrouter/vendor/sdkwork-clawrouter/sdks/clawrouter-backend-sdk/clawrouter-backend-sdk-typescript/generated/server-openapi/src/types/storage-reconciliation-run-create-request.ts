import type { JsonValue } from './json-value';

/** Storage reconciliation run create request schema exposed by Claw Router. */
export interface StorageReconciliationRunCreateRequest {
  [key: string]: JsonValue;
}