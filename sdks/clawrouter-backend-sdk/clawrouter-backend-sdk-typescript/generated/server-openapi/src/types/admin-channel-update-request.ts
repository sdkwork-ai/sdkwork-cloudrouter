/** AdminChannelUpdateRequest contract. */
export interface AdminChannelUpdateRequest {
  /** accessType field on AdminChannelUpdateRequest. */
  accessType?: string;
  /** capabilities field on AdminChannelUpdateRequest. */
  capabilities?: ('llm' | 'image' | 'audio' | 'music' | 'sfx' | 'video')[];
  /** channelType field on AdminChannelUpdateRequest. */
  channelType?: 'official' | 'relay';
  /** circuitBreakerPolicy field on AdminChannelUpdateRequest. */
  circuitBreakerPolicy?: Record<string, unknown> | unknown;
  /** credentialRotation field on AdminChannelUpdateRequest. */
  credentialRotation?: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** credentials field on AdminChannelUpdateRequest. */
  credentials?: Record<string, unknown>[];
  /** expiresAt field on AdminChannelUpdateRequest. */
  expiresAt?: string | unknown;
  /** id field on AdminChannelUpdateRequest. */
  id?: string;
  /** name field on AdminChannelUpdateRequest. */
  name?: string;
  /** protocol field on AdminChannelUpdateRequest. */
  protocol?: string;
  /** resourceCodes field on AdminChannelUpdateRequest. */
  resourceCodes?: string[];
  /** retryPolicy field on AdminChannelUpdateRequest. */
  retryPolicy?: Record<string, unknown> | unknown;
  /** status field on AdminChannelUpdateRequest. */
  status?: 'active' | 'error' | 'disabled';
  /** timeoutMs field on AdminChannelUpdateRequest. */
  timeoutMs?: string | unknown;
  /** vendor field on AdminChannelUpdateRequest. */
  vendor?: string;
  /** weight field on AdminChannelUpdateRequest. */
  weight?: string;
}
