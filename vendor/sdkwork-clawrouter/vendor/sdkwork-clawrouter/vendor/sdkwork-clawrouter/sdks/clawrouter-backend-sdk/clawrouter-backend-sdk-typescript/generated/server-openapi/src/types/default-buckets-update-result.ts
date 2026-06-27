import type { StorageDefaultBucketUpdateResponse } from './storage-default-bucket-update-response';

/** Default buckets update result schema exposed by Claw Router. */
export interface DefaultBucketsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on default buckets update result. */
  data?: StorageDefaultBucketUpdateResponse;
  /** Human-readable response message. */
  msg?: string;
}
