import type { StorageBucketCreateResponse } from './storage-bucket-create-response';

/** Oss buckets create result schema exposed by Claw Router. */
export interface OssBucketsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss buckets create result. */
  data?: StorageBucketCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
