import type { AdminChannelCredentialItem } from './admin-channel-credential-item';
import type { ProviderCircuitBreakerPolicy } from './provider-circuit-breaker-policy';
import type { ProviderRetryPolicy } from './provider-retry-policy';

/** Persisted channel snapshot returned after the provider health probe. Admin management responses may return the stored plaintext provider API key for channel credential relay operations. */
export interface AdminChannelItem {
  /** Access type field on admin channel item. */
  accessType: string;
  /** Balance field on admin channel item. */
  balance: string;
  /** Capabilities field on admin channel item. */
  capabilities: ('llm' | 'image' | 'audio' | 'music' | 'sfx' | 'video')[];
  /** Scoped ai_channel id used by account route and credential configuration. */
  channelId: string;
  /** Channel type field on admin channel item. */
  channelType: 'official' | 'relay';
  /** Circuit breaker policy field on admin channel item. */
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy;
  /** Created at field on admin channel item. */
  createdAt: string;
  /** Credential rotation field on admin channel item. */
  credentialRotation: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** Credentials field on admin channel item. */
  credentials: AdminChannelCredentialItem[];
  /** Errors field on admin channel item. */
  errors: string;
  /** Expires at field on admin channel item. */
  expiresAt?: string | null;
  /** Id field on admin channel item. */
  id: string;
  /** Is multimodal field on admin channel item. */
  isMultimodal: boolean;
  /** Name field on admin channel item. */
  name: string;
  /** Protocol field on admin channel item. */
  protocol: string;
  /** Resource codes field on admin channel item. */
  resourceCodes: string[];
  /** Retry policy field on admin channel item. */
  retryPolicy?: ProviderRetryPolicy;
  /** Status field on admin channel item. */
  status: 'active' | 'disabled' | 'error';
  /** Timeout ms field on admin channel item. */
  timeoutMs?: string;
  /** Vendor field on admin channel item. */
  vendor: string;
  /** Weight field on admin channel item. */
  weight: string;
}
