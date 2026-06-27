import type { StorageGarbageCollectionJobListResponse } from './storage-garbage-collection-job-list-response';

/** Gc jobs list result schema exposed by Claw Router. */
export interface GcJobsListResult {
  /** Business response code. */
  code: string;
  /** Data field on gc jobs list result. */
  data?: StorageGarbageCollectionJobListResponse;
  /** Human-readable response message. */
  msg?: string;
}
