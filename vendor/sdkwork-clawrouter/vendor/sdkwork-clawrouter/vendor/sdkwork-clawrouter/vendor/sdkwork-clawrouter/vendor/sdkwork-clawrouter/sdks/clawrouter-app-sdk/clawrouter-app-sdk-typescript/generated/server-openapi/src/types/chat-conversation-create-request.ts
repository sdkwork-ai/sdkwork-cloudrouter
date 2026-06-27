import type { JsonValue } from './json-value';

/** Chat conversation create request schema exposed by Claw Router. */
export interface ChatConversationCreateRequest {
  /** Agent id field on chat conversation create request. */
  agentId?: string;
  /** Agent session id field on chat conversation create request. */
  agentSessionId?: string;
  /** Default model field on chat conversation create request. */
  defaultModel?: string;
  /** Default provider field on chat conversation create request. */
  defaultProvider?: string;
  /** Memory space id field on chat conversation create request. */
  memorySpaceId?: string;
  /** Metadata field on chat conversation create request. */
  metadata?: Record<string, JsonValue>;
  /** Source surface field on chat conversation create request. */
  sourceSurface?: string;
  /** Title field on chat conversation create request. */
  title?: string;
}
