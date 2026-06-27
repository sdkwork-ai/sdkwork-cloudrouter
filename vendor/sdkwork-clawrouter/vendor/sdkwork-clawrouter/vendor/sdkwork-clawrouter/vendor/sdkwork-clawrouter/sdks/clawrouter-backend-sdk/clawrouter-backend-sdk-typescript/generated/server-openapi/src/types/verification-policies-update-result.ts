import type { VerificationPolicyUpdateResponse } from './verification-policy-update-response';

/** Verification policies update result schema exposed by Claw Router. */
export interface VerificationPoliciesUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on verification policies update result. */
  data?: VerificationPolicyUpdateResponse;
  /** Human-readable response message. */
  msg?: string;
}
