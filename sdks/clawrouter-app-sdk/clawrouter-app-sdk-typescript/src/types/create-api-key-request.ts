/** Create api key request schema exposed by Claw Router. */
export interface CreateApiKeyRequest {
  /** API key channel group code. */
  channelGroup: string;
  /** Create this key as the default backend runtime API key. */
  defaultForRuntime?: boolean;
  /** Expiration timestamp in YYYY-MM-DDTHH:mm format, or never. */
  expires: string;
  /** Comma-separated IP or CIDR allowlist, or unrestricted. */
  ipLimit: string;
  /** Whether the quota is unlimited. */
  isUnlimitedQuota: boolean;
  /** Modalities field on create api key request. */
  modalities: ('text' | 'image' | 'video' | 'audio' | 'music')[];
  /** API key display name. */
  name: string;
  /** Quota limit as a canonical decimal string. */
  quota: string;
}
