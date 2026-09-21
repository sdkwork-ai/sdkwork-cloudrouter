/** Decrypted upstream account credential secret schema exposed by Cloud Router for the administrative edit surface. */
export interface UpstreamAccountCredentialSecret {
  /** Account id field on upstream account credential secret. */
  accountId: string;
  /** Auth method code field on upstream account credential secret. */
  authMethodCode: string;
  /** Credential name field on upstream account credential secret. */
  credentialName: string;
  /** Credential version field on upstream account credential secret. */
  credentialVersion: string;
  /** Id field on upstream account credential secret. */
  id: string;
  /** Is active field on upstream account credential secret. */
  isActive: boolean;
  /** Masked label field on upstream account credential secret. */
  maskedLabel: string | null;
  /** Decrypted plaintext secret. Present only on this reveal endpoint; the credentials list endpoint never returns plaintext. */
  secret: string;
  /** Status field on upstream account credential secret. */
  status: number;
}
