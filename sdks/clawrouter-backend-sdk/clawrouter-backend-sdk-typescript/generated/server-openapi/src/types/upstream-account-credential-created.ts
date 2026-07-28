/** Upstream account credential created schema exposed by Claw Router. */
export interface UpstreamAccountCredentialCreated {
  /** Auth method code field on upstream account credential created. */
  authMethodCode: string;
  /** Credential name field on upstream account credential created. */
  credentialName: string;
  /** Credential version field on upstream account credential created. */
  credentialVersion: string;
  /** Expires at field on upstream account credential created. */
  expiresAt: string | null;
  /** Id field on upstream account credential created. */
  id: string;
  /** Is active field on upstream account credential created. */
  isActive: boolean;
  /** Last rotated at field on upstream account credential created. */
  lastRotatedAt: string | null;
  /** Last used at field on upstream account credential created. */
  lastUsedAt: string | null;
  /** Last verified at field on upstream account credential created. */
  lastVerifiedAt: string | null;
  /** Masked label field on upstream account credential created. */
  maskedLabel: string | null;
  /** Priority field on upstream account credential created. */
  priority: number;
  /** One-time plaintext credential returned only by this create response. */
  rawSecret: string;
  /** Status field on upstream account credential created. */
  status: number;
}
