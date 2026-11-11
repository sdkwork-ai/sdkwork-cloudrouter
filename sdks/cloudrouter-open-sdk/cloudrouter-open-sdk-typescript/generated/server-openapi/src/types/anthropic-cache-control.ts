import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic prompt-cache breakpoint. */
export interface AnthropicCacheControl {
  /** Cache breakpoint time-to-live. */
  ttl?: '5m' | '1h';
  /** Cache control type. */
  type: 'ephemeral';
}
