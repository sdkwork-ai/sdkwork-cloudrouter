import type { JsonValue } from './json-value';

/** Messaging template list response schema exposed by Claw Router. */
export interface MessagingTemplateListResponse {
  /** Items field on messaging template list response. */
  items: Record<string, JsonValue>[];
}
