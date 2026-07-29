/** Update api key request schema exposed by Claw Router. */
export interface UpdateApiKeyRequest {
  /** Upstream account group code to bind to this key. */
  accountGroup?: string;
  /** Marks this API key as the default backend runtime API key for Playground and app runtime calls. */
  defaultForRuntime?: boolean;
  /** Expiration timestamp in YYYY-MM-DDTHH:mm format, or never. */
  expires?: string;
  /** Comma-separated IP or CIDR allowlist, or unrestricted. */
  ipLimit?: string;
  /** Whether the quota is unlimited. */
  isUnlimitedQuota?: boolean;
  /** Modalities field on update api key request. */
  modalities?: ('text' | 'image' | 'video' | 'audio' | 'music')[];
  /** API key display name. */
  name?: string;
  /** Optional quota limit as a canonical decimal string. */
  quota?: string;
}
