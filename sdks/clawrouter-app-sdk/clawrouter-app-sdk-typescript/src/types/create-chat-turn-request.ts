import type { JsonValue } from './json-value';

/** Create chat turn request schema exposed by Claw Router. */
export interface CreateChatTurnRequest {
  /** Agent id field on create chat turn request. */
  agentId?: string;
  /** Agent session id field on create chat turn request. */
  agentSessionId?: string;
  /** Message field on create chat turn request. */
  message: string;
  /** Metadata field on create chat turn request. */
  metadata?: Record<string, JsonValue>;
  /** Mode field on create chat turn request. */
  mode?: string;
  /** Model field on create chat turn request. */
  model?: string;
  /** Provider field on create chat turn request. */
  provider?: string;
}
