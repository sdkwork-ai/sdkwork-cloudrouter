import type { JsonValue } from './json-value';

/** Runtime event item schema exposed by Claw Router. */
export interface RuntimeEventItem {
  /** Created at field on runtime event item. */
  createdAt: string;
  /** Event no field on runtime event item. */
  eventNo: string;
  /** Event source field on runtime event item. */
  eventSource: string;
  /** Event type field on runtime event item. */
  eventType: string;
  /** Id field on runtime event item. */
  id: string;
  /** Invocation id field on runtime event item. */
  invocationId: string;
  /** Payload json field on runtime event item. */
  payloadJson: Record<string, JsonValue>;
  /** Text delta field on runtime event item. */
  textDelta?: string | null;
}
