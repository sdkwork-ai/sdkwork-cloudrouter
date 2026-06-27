import type { JsonValue } from './json-value';

/** Messaging suppression list response schema exposed by Claw Router. */
export interface MessagingSuppressionListResponse {
  /** Items field on messaging suppression list response. */
  items: Record<string, JsonValue>[];
}
