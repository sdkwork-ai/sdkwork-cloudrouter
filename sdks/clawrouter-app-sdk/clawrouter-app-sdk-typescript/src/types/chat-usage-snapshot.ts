/** Chat usage snapshot schema exposed by Claw Router. */
export interface ChatUsageSnapshot {
  /** Cached tokens field on chat usage snapshot. */
  cachedTokens: string;
  /** Cost amount field on chat usage snapshot. */
  costAmount: string | null;
  /** Currency field on chat usage snapshot. */
  currency: string | null;
  /** Input tokens field on chat usage snapshot. */
  inputTokens: string;
  /** Output tokens field on chat usage snapshot. */
  outputTokens: string;
  /** Reasoning tokens field on chat usage snapshot. */
  reasoningTokens: string;
  /** Total tokens field on chat usage snapshot. */
  totalTokens: string;
}
