/** Routing retry policy schema exposed by Claw Router. */
export interface RoutingRetryPolicy {
  /** Backoff ms field on routing retry policy. */
  backoffMs: string;
  /** Max attempts field on routing retry policy. */
  maxAttempts: string;
  /** Retryable status codes field on routing retry policy. */
  retryableStatusCodes: string[];
}
