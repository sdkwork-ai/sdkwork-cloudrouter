import type { JsonValue } from './json-value';

/** Messaging sender identity list response schema exposed by Claw Router. */
export interface MessagingSenderIdentityListResponse {
  /** Items field on messaging sender identity list response. */
  items: Record<string, JsonValue>[];
}
