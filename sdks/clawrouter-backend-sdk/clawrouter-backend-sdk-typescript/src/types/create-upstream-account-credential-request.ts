/** Create upstream account credential request schema exposed by Claw Router. */
export interface CreateUpstreamAccountCredentialRequest {
  /** Credential name field on create upstream account credential request. */
  credentialName: string;
  /** Expires at field on create upstream account credential request. */
  expiresAt?: string | null;
  /** Priority field on create upstream account credential request. */
  priority?: number | null;
  /** Secret field on create upstream account credential request. */
  secret: string;
}
