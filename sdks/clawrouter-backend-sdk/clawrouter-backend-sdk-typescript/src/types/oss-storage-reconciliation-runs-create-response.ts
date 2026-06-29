import type { OssStorageReconciliationRunsCreateResult } from './oss-storage-reconciliation-runs-create-result';

export interface OssStorageReconciliationRunsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
