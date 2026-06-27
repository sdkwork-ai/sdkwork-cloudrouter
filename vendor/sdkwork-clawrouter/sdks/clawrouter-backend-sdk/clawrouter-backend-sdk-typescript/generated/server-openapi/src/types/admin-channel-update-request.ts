import type { AdminChannelCredentialInput } from './admin-channel-credential-input';
import type { JsonNull } from './json-null';
import type { ProviderCircuitBreakerPolicy } from './provider-circuit-breaker-policy';
import type { ProviderRetryPolicy } from './provider-retry-policy';

/** Admin channel update request schema exposed by Claw Router. */
export interface AdminChannelUpdateRequest {
  /** Access type field on admin channel update request. */
  accessType?: string;
  /** Capabilities field on admin channel update request. */
  capabilities?: ('llm' | 'image' | 'audio' | 'music' | 'sfx' | 'video')[];
  /** Channel type field on admin channel update request. */
  channelType?: 'official' | 'relay';
  /** Circuit breaker policy field on admin channel update request. */
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy | JsonNull;
  /** Credential rotation field on admin channel update request. */
  credentialRotation?: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** Replaces the complete upstream credential list when provided. */
  credentials?: AdminChannelCredentialInput[];
  /** Expires at field on admin channel update request. */
  expiresAt?: string | null;
  /** Id field on admin channel update request. */
  id: string;
  /** Name field on admin channel update request. */
  name?: string;
  /** Protocol field on admin channel update request. */
  protocol?: string;
  /** Resource codes field on admin channel update request. */
  resourceCodes?: string[];
  /** Retry policy field on admin channel update request. */
  retryPolicy?: ProviderRetryPolicy | JsonNull;
  /** Status field on admin channel update request. */
  status?: 'active' | 'disabled' | 'error';
  /** Timeout ms field on admin channel update request. */
  timeoutMs?: string | null;
  /** Vendor field on admin channel update request. */
  vendor?: string;
  /** Weight field on admin channel update request. */
  weight?: string;
}
