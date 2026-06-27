/** Persisted rate limit rule snapshot returned by the backend. */
export interface AdminRateLimitItem {
  /** Block duration field on admin rate limit item. */
  blockDuration?: string;
  /** Burst field on admin rate limit item. */
  burst?: number;
  /** Channel group field on admin rate limit item. */
  channelGroup?: string;
  /** Channel group id field on admin rate limit item. */
  channelGroupId?: string;
  /** Channel group name field on admin rate limit item. */
  channelGroupName?: string;
  /** Id field on admin rate limit item. */
  id: string;
  /** Key prefix field on admin rate limit item. */
  keyPrefix?: string;
  /** Model field on admin rate limit item. */
  model?: string;
  /** Rpd field on admin rate limit item. */
  rpd?: number;
  /** Rpm field on admin rate limit item. */
  rpm?: number;
  /** Rps field on admin rate limit item. */
  rps?: number;
  /** Rule name field on admin rate limit item. */
  ruleName?: string;
  /** Status field on admin rate limit item. */
  status?: 'active' | 'inactive' | 'exhausted';
  /** Target ip field on admin rate limit item. */
  targetIp?: string;
  /** Tpm field on admin rate limit item. */
  tpm?: number;
  /** User field on admin rate limit item. */
  user?: string;
}
