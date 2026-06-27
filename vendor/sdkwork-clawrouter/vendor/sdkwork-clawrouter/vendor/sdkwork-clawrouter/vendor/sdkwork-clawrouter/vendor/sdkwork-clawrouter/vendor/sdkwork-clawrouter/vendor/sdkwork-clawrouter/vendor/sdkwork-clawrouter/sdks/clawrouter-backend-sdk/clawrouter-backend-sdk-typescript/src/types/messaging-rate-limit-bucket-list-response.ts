import type { JsonValue } from './json-value';

/** Messaging rate limit bucket list response schema exposed by Claw Router. */
export interface MessagingRateLimitBucketListResponse {
  /** Items field on messaging rate limit bucket list response. */
  items: Record<string, JsonValue>[];
}
