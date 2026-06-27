import type { JsonValue } from './json-value';

/** Messaging route rule list response schema exposed by Claw Router. */
export interface MessagingRouteRuleListResponse {
  /** Items field on messaging route rule list response. */
  items: Record<string, JsonValue>[];
}
