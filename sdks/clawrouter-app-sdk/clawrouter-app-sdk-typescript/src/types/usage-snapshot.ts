import type { JsonValue } from './json-value';

/** Usage snapshot schema exposed by Claw Router. */
export interface UsageSnapshot {
  /** Cached tokens field on usage snapshot. */
  cachedTokens?: string;
  /** Input tokens field on usage snapshot. */
  inputTokens?: string;
  /** Output tokens field on usage snapshot. */
  outputTokens?: string;
  /** Total tokens field on usage snapshot. */
  totalTokens?: string;
}
