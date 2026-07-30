import type { JsonValue } from './json-value';

/** Create runtime event request schema exposed by Claw Router. */
export interface CreateRuntimeEventRequest {
  /** Event source field on create runtime event request. */
  eventSource?: string;
  /** Event type field on create runtime event request. */
  eventType: string;
  /** Metadata field on create runtime event request. */
  metadata?: Record<string, JsonValue>;
  /** Payload json field on create runtime event request. */
  payloadJson?: Record<string, JsonValue>;
  /** Text delta field on create runtime event request. */
  textDelta?: string;
}
