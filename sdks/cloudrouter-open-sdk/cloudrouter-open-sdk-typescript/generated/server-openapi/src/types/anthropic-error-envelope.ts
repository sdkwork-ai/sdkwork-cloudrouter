import type { ProviderJsonValue } from './provider-json-value';

/** Error envelope returned by the Anthropic Messages API. */
export interface AnthropicErrorEnvelope {
  /** Anthropic Messages error details. */
  error: { message: string; type: string; } & Record<string, ProviderJsonValue>;
  /** Gateway request identifier. */
  request_id: string;
  /** Anthropic error event type. */
  type: 'error';
}
