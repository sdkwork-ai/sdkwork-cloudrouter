import type { StorageBucketListResponse } from './storage-bucket-list-response';

/** Oss buckets list result schema exposed by Claw Router. */
export interface OssBucketsListResult {
  /** Business response code. */
  code: string;
  /** Data field on oss buckets list result. */
  data?: StorageBucketListResponse;
  /** Human-readable response message. */
  msg?: string;
}
