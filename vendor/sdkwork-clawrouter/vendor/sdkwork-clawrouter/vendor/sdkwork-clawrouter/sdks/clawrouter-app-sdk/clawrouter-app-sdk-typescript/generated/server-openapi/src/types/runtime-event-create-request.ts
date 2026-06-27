import type { JsonValue } from './json-value';

/** Runtime event create request schema exposed by Claw Router. */
export interface RuntimeEventCreateRequest {
  /** Event source field on runtime event create request. */
  eventSource?: string;
  /** Event type field on runtime event create request. */
  eventType: string;
  /** Metadata field on runtime event create request. */
  metadata?: Record<string, JsonValue>;
  /** Payload json field on runtime event create request. */
  payloadJson?: Record<string, JsonValue>;
  /** Text delta field on runtime event create request. */
  textDelta?: string;
}
