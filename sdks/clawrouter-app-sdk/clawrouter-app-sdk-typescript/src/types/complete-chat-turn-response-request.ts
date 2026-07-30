import type { JsonValue } from './json-value';

/** Complete chat turn response request schema exposed by Claw Router. */
export interface CompleteChatTurnResponseRequest {
  /** Message field on complete chat turn response request. */
  message: string;
  /** Metadata field on complete chat turn response request. */
  metadata?: Record<string, JsonValue>;
  /** Model field on complete chat turn response request. */
  model?: string;
  /** Provider field on complete chat turn response request. */
  provider?: string;
  /** Runtime field on complete chat turn response request. */
  runtime?: string;
  /** Runtime invocation id field on complete chat turn response request. */
  runtimeInvocationId?: string;
  /** Status field on complete chat turn response request. */
  status?: 'completed' | 'failed' | 'cancelled' | 'streaming';
  /** Usage field on complete chat turn response request. */
  usage?: { cachedTokens?: string; cost?: string; costAmount?: string; currency?: string; inputTokens?: string; outputTokens?: string; reasoningTokens?: string; totalTokens?: string; };
  /** Usage fact id field on complete chat turn response request. */
  usageFactId?: string;
}
