import type { VerificationPolicyListResponse } from './verification-policy-list-response';

/** Verification policies list result schema exposed by Claw Router. */
export interface VerificationPoliciesListResult {
  /** Business response code. */
  code: string;
  /** Data field on verification policies list result. */
  data?: VerificationPolicyListResponse;
  /** Human-readable response message. */
  msg?: string;
}
