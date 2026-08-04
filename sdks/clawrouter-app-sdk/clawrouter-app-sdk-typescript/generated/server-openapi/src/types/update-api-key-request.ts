/** Update api key request schema exposed by Claw Router. */
export interface UpdateApiKeyRequest {
  /** Upstream account group code to bind to this key. */
  accountGroup?: string;
  /** Route binding group codes; Some replaces all route bindings (first entry becomes the default group). Replaces accountGroup when provided. */
  accountGroups?: string[] | null;
  /** Per-API-key call-chain policy (concurrency limits, IP allow/deny lists, stage switches). Some upserts the key's chain policy; omitted leaves it unchanged. */
  chain?: { concurrency?: { maxInflight?: string | null; maxInflightPerScope?: Record<string, string> | null; }; ipAccess?: { allowlist?: string[] | null; denylist?: string[] | null; mode?: 'open' | 'allowlistOnly' | null; }; policyName?: string | null; stages?: { disabled?: string[] | null; enabledOnly?: string[] | null; }; } | null;
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
