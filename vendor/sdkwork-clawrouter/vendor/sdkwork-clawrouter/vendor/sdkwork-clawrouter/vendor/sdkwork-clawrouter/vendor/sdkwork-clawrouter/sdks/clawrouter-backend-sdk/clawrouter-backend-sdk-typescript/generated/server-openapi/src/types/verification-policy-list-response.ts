import type { JsonValue } from './json-value';

/** Verification policy list response schema exposed by Claw Router. */
export interface VerificationPolicyListResponse {
  /** Items field on verification policy list response. */
  items: Record<string, JsonValue>[];
}
