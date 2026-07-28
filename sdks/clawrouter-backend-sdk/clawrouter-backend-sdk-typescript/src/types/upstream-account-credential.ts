/** Upstream account credential schema exposed by Claw Router. */
export interface UpstreamAccountCredential {
  /** Auth method code field on upstream account credential. */
  authMethodCode: string;
  /** Credential name field on upstream account credential. */
  credentialName: string;
  /** Credential version field on upstream account credential. */
  credentialVersion: string;
  /** Expires at field on upstream account credential. */
  expiresAt: string | null;
  /** Id field on upstream account credential. */
  id: string;
  /** Is active field on upstream account credential. */
  isActive: boolean;
  /** Last rotated at field on upstream account credential. */
  lastRotatedAt: string | null;
  /** Last used at field on upstream account credential. */
  lastUsedAt: string | null;
  /** Last verified at field on upstream account credential. */
  lastVerifiedAt: string | null;
  /** Masked label field on upstream account credential. */
  maskedLabel: string | null;
  /** Priority field on upstream account credential. */
  priority: number;
  /** Status field on upstream account credential. */
  status: number;
}
