/** AdminChannelItem contract. */
export interface AdminChannelItem {
  /** accessType field on AdminChannelItem. */
  accessType: string;
  /** balance field on AdminChannelItem. */
  balance: string;
  /** capabilities field on AdminChannelItem. */
  capabilities: string[];
  /** channelId field on AdminChannelItem. */
  channelId: string;
  /** channelType field on AdminChannelItem. */
  channelType: 'official' | 'relay';
  /** circuitBreakerPolicy field on AdminChannelItem. */
  circuitBreakerPolicy?: Record<string, unknown> | unknown;
  /** createdAt field on AdminChannelItem. */
  createdAt: string;
  /** credentialRotation field on AdminChannelItem. */
  credentialRotation: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** credentials field on AdminChannelItem. */
  credentials: Record<string, unknown>[];
  /** errors field on AdminChannelItem. */
  errors: number;
  /** expiresAt field on AdminChannelItem. */
  expiresAt?: string | unknown;
  /** id field on AdminChannelItem. */
  id: string;
  /** isMultimodal field on AdminChannelItem. */
  isMultimodal: boolean;
  /** name field on AdminChannelItem. */
  name: string;
  /** protocol field on AdminChannelItem. */
  protocol: string;
  /** resourceCodes field on AdminChannelItem. */
  resourceCodes: string[];
  /** retryPolicy field on AdminChannelItem. */
  retryPolicy?: Record<string, unknown> | unknown;
  /** status field on AdminChannelItem. */
  status: 'active' | 'error' | 'disabled';
  /** timeoutMs field on AdminChannelItem. */
  timeoutMs?: string | unknown;
  /** vendor field on AdminChannelItem. */
  vendor: string;
  /** weight field on AdminChannelItem. */
  weight: string;
}
