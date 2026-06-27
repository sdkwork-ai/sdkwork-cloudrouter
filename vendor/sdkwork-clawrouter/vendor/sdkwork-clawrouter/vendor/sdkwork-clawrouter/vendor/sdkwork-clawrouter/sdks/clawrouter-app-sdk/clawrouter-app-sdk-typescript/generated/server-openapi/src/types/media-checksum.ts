/** Media checksum schema exposed by Claw Router. */
export interface MediaChecksum {
  /** Algorithm field on media checksum. */
  algorithm: 'sha256' | 'md5' | 'etag';
  /** Value field on media checksum. */
  value: string;
}
