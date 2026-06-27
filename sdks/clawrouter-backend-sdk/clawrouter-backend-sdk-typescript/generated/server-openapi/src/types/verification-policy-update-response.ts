import type { JsonValue } from './json-value';

/** Verification policy update response schema exposed by Claw Router. */
export interface VerificationPolicyUpdateResponse {
  /** Channel field on verification policy update response. */
  channel?: string;
  /** Id field on verification policy update response. */
  id?: string;
  /** Status field on verification policy update response. */
  status?: string;
}
