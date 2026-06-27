import type { JsonValue } from './json-value';

/** Chat turn create request schema exposed by Claw Router. */
export interface ChatTurnCreateRequest {
  /** Agent id field on chat turn create request. */
  agentId?: string;
  /** Agent session id field on chat turn create request. */
  agentSessionId?: string;
  /** Message field on chat turn create request. */
  message: string;
  /** Metadata field on chat turn create request. */
  metadata?: Record<string, JsonValue>;
  /** Mode field on chat turn create request. */
  mode?: string;
  /** Model field on chat turn create request. */
  model?: string;
  /** Provider field on chat turn create request. */
  provider?: string;
}
