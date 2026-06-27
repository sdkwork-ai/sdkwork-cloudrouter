import type { StorageReconciliationRunCreateResponse } from './storage-reconciliation-run-create-response';

/** Oss storage reconciliation runs create result schema exposed by Claw Router. */
export interface OssStorageReconciliationRunsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss storage reconciliation runs create result. */
  data?: StorageReconciliationRunCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
