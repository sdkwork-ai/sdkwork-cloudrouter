import type { MessagingRateLimitBucketListResponse } from './messaging-rate-limit-bucket-list-response';

/** Rate limit buckets list result schema exposed by Claw Router. */
export interface RateLimitBucketsListResult {
  /** Business response code. */
  code: string;
  /** Data field on rate limit buckets list result. */
  data?: MessagingRateLimitBucketListResponse;
  /** Human-readable response message. */
  msg?: string;
}
