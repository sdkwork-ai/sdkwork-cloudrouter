import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic usage schema exposed by Claw Router vendor routing. */
export interface AnthropicUsage {
  /** Input tokens written to cache. */
  cache_creation_input_tokens?: number;
  /** Input tokens read from cache. */
  cache_read_input_tokens?: number;
  /** Input token count. */
  input_tokens?: number;
  /** Output token count. */
  output_tokens?: number;
}
