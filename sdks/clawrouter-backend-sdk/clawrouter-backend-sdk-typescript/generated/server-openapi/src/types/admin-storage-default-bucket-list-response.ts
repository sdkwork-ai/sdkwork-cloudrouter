import type { AdminStorageDefaultBucket } from './admin-storage-default-bucket';
import type { PageInfo } from './page-info';

/** Admin storage default bucket list response schema exposed by Claw Router. */
export interface AdminStorageDefaultBucketListResponse {
  /** Items field on admin storage default bucket list response. */
  items: AdminStorageDefaultBucket[];
  /** Page info field on admin storage default bucket list response. */
  pageInfo: PageInfo;
}
