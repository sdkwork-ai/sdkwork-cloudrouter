import type { JsonValue } from './json-value';

/** Chat turn response request schema exposed by Claw Router. */
export interface ChatTurnResponseRequest {
  /** Message field on chat turn response request. */
  message: string;
  /** Metadata field on chat turn response request. */
  metadata?: Record<string, JsonValue>;
  /** Model field on chat turn response request. */
  model?: string;
  /** Provider field on chat turn response request. */
  provider?: string;
  /** Runtime adapter such as claude_code, gemini, codex, openai_compatible, or custom. */
  runtime?: string;
  /** Runtime invocation id field on chat turn response request. */
  runtimeInvocationId?: string;
  /** Status field on chat turn response request. */
  status?: 'completed' | 'failed' | 'cancelled' | 'streaming';
  /** Usage field on chat turn response request. */
  usage?: Record<string, unknown>;
  /** Usage fact id field on chat turn response request. */
  usageFactId?: string;
}
