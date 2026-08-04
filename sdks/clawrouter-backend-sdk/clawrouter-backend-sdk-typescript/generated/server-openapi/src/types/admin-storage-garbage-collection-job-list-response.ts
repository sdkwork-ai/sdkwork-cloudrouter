import type { AdminStorageGarbageCollectionJob } from './admin-storage-garbage-collection-job';
import type { PageInfo } from './page-info';

/** Admin storage garbage collection job list response schema exposed by Claw Router. */
export interface AdminStorageGarbageCollectionJobListResponse {
  /** Items field on admin storage garbage collection job list response. */
  items: AdminStorageGarbageCollectionJob[];
  /** Page info field on admin storage garbage collection job list response. */
  pageInfo: PageInfo;
}
