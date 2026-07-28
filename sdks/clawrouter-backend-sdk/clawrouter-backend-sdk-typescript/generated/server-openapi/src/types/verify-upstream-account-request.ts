/** Verify upstream account request schema exposed by Claw Router. */
export interface VerifyUpstreamAccountRequest {
  /** Credential id field on verify upstream account request. */
  credentialId?: string | null;
  /** Endpoint id field on verify upstream account request. */
  endpointId?: string | null;
  /** Timeout ms field on verify upstream account request. */
  timeoutMs?: number | null;
}
