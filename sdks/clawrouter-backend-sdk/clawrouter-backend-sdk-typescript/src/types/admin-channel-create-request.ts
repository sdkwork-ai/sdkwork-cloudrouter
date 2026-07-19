/** AdminChannelCreateRequest contract. */
export interface AdminChannelCreateRequest {
  /** accessType field on AdminChannelCreateRequest. */
  accessType?: string;
  /** capabilities field on AdminChannelCreateRequest. */
  capabilities?: ('llm' | 'image' | 'audio' | 'music' | 'sfx' | 'video')[];
  /** channelType field on AdminChannelCreateRequest. */
  channelType?: 'official' | 'relay';
  /** circuitBreakerPolicy field on AdminChannelCreateRequest. */
  circuitBreakerPolicy?: Record<string, unknown> | unknown;
  /** credentialRotation field on AdminChannelCreateRequest. */
  credentialRotation?: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** credentials field on AdminChannelCreateRequest. */
  credentials: Record<string, unknown>[];
  /** expiresAt field on AdminChannelCreateRequest. */
  expiresAt?: string | unknown;
  /** id field on AdminChannelCreateRequest. */
  id?: string;
  /** name field on AdminChannelCreateRequest. */
  name: string;
  /** protocol field on AdminChannelCreateRequest. */
  protocol?: string;
  /** resourceCodes field on AdminChannelCreateRequest. */
  resourceCodes?: string[];
  /** retryPolicy field on AdminChannelCreateRequest. */
  retryPolicy?: Record<string, unknown> | unknown;
  /** status field on AdminChannelCreateRequest. */
  status?: 'active' | 'error' | 'disabled';
  /** timeoutMs field on AdminChannelCreateRequest. */
  timeoutMs?: string | unknown;
  /** vendor field on AdminChannelCreateRequest. */
  vendor: string;
  /** weight field on AdminChannelCreateRequest. */
  weight?: string;
}
