/** Provider retry policy schema exposed by Claw Router. */
export interface ProviderRetryPolicy {
  /** Backoff ms field on provider retry policy. */
  backoffMs?: number;
  /** Max attempts field on provider retry policy. */
  maxAttempts: number;
  /** Retryable status codes field on provider retry policy. */
  retryableStatusCodes: (408 | 409 | 425 | 429 | 500 | 502 | 503 | 504)[];
}
