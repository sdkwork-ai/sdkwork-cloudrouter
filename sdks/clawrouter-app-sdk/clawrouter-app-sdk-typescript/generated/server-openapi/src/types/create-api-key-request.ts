/** Create api key request schema exposed by Claw Router. */
export interface CreateApiKeyRequest {
  /** Upstream account group code authorized for this API key. Replaced by accountGroups when provided. */
  accountGroup?: string;
  /** Route binding group codes (binding_role='route'); the first entry becomes the default group. Replaces accountGroup when provided. */
  accountGroups?: string[] | null;
  /** Per-API-key call-chain policy applied at creation time. */
  chain?: { concurrency?: { maxInflight?: string | null; maxInflightPerScope?: Record<string, string> | null; }; ipAccess?: { allowlist?: string[] | null; denylist?: string[] | null; mode?: 'open' | 'allowlistOnly' | null; }; policyName?: string | null; stages?: { disabled?: string[] | null; enabledOnly?: string[] | null; }; } | null;
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
