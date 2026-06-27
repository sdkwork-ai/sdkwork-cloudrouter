import type { AdminChannelCredentialInput } from './admin-channel-credential-input';
import type { ProviderCircuitBreakerPolicy } from './provider-circuit-breaker-policy';
import type { ProviderRetryPolicy } from './provider-retry-policy';

/** Admin channel create request schema exposed by Claw Router. */
export interface AdminChannelCreateRequest {
  /** Access type field on admin channel create request. */
  accessType?: string;
  /** Capabilities field on admin channel create request. */
  capabilities?: ('llm' | 'image' | 'audio' | 'music' | 'sfx' | 'video')[];
  /** Channel type. official means a direct vendor account; relay means an upstream aggregator account that can expose multiple vendors. */
  channelType?: 'official' | 'relay';
  /** Circuit breaker policy field on admin channel create request. */
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy;
  /** Credential selection strategy for the upstream credential list. */
  credentialRotation?: 'default' | 'priority' | 'round_robin' | 'weighted_round_robin' | 'random';
  /** Credentials field on admin channel create request. */
  credentials: AdminChannelCredentialInput[];
  /** Expires at field on admin channel create request. */
  expiresAt?: string | null;
  /** Name field on admin channel create request. */
  name: string;
  /** Protocol field on admin channel create request. */
  protocol?: string;
  /** Resource bindings selected from ai_resource or ai_resource_group, such as vendor.openai, api.openai.chat_completions, model.openai.gpt-4o-mini.chat, or bundle.openrouter.openai.standard. */
  resourceCodes?: string[];
  /** Retry policy field on admin channel create request. */
  retryPolicy?: ProviderRetryPolicy;
  /** Status field on admin channel create request. */
  status?: 'active' | 'disabled' | 'error';
  /** Per-channel upstream response timeout in milliseconds. */
  timeoutMs?: string;
  /** Vendor field on admin channel create request. */
  vendor: string;
  /** Weight field on admin channel create request. */
  weight?: string;
}
