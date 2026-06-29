import type { VerificationPoliciesUpdateResult } from './verification-policies-update-result';

export interface VerificationPoliciesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
