import type { StorageReconciliationRunListResponse } from './storage-reconciliation-run-list-response';

/** Oss storage reconciliation runs list result schema exposed by Claw Router. */
export interface OssStorageReconciliationRunsListResult {
  /** Business response code. */
  code: string;
  /** Data field on oss storage reconciliation runs list result. */
  data?: StorageReconciliationRunListResponse;
  /** Human-readable response message. */
  msg?: string;
}
