import type { AdminStorageReconciliationRun } from './admin-storage-reconciliation-run';
import type { PageInfo } from './page-info';

/** Admin storage reconciliation run list response schema exposed by Claw Router. */
export interface AdminStorageReconciliationRunListResponse {
  /** Items field on admin storage reconciliation run list response. */
  items: AdminStorageReconciliationRun[];
  /** Page info field on admin storage reconciliation run list response. */
  pageInfo: PageInfo;
}
