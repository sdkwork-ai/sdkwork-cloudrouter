import type { AdminStorageBucket } from './admin-storage-bucket';
import type { PageInfo } from './page-info';

/** Admin storage bucket list response schema exposed by Claw Router. */
export interface AdminStorageBucketListResponse {
  /** Items field on admin storage bucket list response. */
  items: AdminStorageBucket[];
  /** Page info field on admin storage bucket list response. */
  pageInfo: PageInfo;
}
