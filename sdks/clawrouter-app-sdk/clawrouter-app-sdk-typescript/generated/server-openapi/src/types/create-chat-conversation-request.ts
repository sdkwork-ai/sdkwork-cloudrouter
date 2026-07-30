import type { JsonValue } from './json-value';

/** Create chat conversation request schema exposed by Claw Router. */
export interface CreateChatConversationRequest {
  /** Agent id field on create chat conversation request. */
  agentId?: string;
  /** Agent session id field on create chat conversation request. */
  agentSessionId?: string;
  /** Default model field on create chat conversation request. */
  defaultModel?: string;
  /** Default provider field on create chat conversation request. */
  defaultProvider?: string;
  /** Memory space id field on create chat conversation request. */
  memorySpaceId?: string;
  /** Metadata field on create chat conversation request. */
  metadata?: Record<string, JsonValue>;
  /** Source surface field on create chat conversation request. */
  sourceSurface?: string;
  /** Title field on create chat conversation request. */
  title?: string;
}
