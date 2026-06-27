import type { JsonValue } from './json-value';

/** Messaging provider account list response schema exposed by Claw Router. */
export interface MessagingProviderAccountListResponse {
  /** Items field on messaging provider account list response. */
  items: Record<string, JsonValue>[];
  /** Page field on messaging provider account list response. */
  page: string;
  /** Page size field on messaging provider account list response. */
  pageSize: string;
  /** Total field on messaging provider account list response. */
  total: string;
}
