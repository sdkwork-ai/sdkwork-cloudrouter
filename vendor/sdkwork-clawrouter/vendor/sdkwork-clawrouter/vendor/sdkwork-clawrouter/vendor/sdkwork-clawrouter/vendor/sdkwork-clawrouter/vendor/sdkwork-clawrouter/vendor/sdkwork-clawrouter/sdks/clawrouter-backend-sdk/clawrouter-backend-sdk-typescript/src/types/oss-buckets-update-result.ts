import type { StorageBucketUpdateResponse } from './storage-bucket-update-response';

/** Oss buckets update result schema exposed by Claw Router. */
export interface OssBucketsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss buckets update result. */
  data?: StorageBucketUpdateResponse;
  /** Human-readable response message. */
  msg?: string;
}
