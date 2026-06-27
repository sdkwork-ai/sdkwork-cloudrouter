import type { JsonValue } from './json-value';

/** Storage reconciliation run list response schema exposed by Claw Router. */
export interface StorageReconciliationRunListResponse {
  /** Items field on storage reconciliation run list response. */
  items: Record<string, JsonValue>[];
}
