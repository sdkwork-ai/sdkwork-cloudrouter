/** Media access schema exposed by Cloud Router. */
export interface MediaAccess {
  /** Expires at field on media access. */
  expiresAt?: string;
  /** Visibility field on media access. */
  visibility: 'private' | 'tenant' | 'organization' | 'public' | 'signed';
}
