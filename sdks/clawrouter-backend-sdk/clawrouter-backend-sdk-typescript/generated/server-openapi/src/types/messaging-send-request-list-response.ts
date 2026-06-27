import type { JsonValue } from './json-value';

/** Messaging send request list response schema exposed by Claw Router. */
export interface MessagingSendRequestListResponse {
  /** Items field on messaging send request list response. */
  items: Record<string, JsonValue>[];
}
