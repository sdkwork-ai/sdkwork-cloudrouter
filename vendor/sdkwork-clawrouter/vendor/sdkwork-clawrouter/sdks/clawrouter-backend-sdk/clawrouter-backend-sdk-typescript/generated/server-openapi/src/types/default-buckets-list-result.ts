import type { StorageDefaultBucketListResponse } from './storage-default-bucket-list-response';

/** Default buckets list result schema exposed by Claw Router. */
export interface DefaultBucketsListResult {
  /** Business response code. */
  code: string;
  /** Data field on default buckets list result. */
  data?: StorageDefaultBucketListResponse;
  /** Human-readable response message. */
  msg?: string;
}
