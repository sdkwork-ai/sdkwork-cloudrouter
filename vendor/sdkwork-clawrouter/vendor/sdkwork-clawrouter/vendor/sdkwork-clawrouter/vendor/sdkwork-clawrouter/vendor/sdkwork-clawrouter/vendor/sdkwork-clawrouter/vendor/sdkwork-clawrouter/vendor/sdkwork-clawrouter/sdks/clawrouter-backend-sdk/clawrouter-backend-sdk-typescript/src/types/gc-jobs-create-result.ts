import type { StorageGarbageCollectionJobCreateResponse } from './storage-garbage-collection-job-create-response';

/** Gc jobs create result schema exposed by Claw Router. */
export interface GcJobsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on gc jobs create result. */
  data?: StorageGarbageCollectionJobCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
