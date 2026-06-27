import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic count message tokens response schema exposed by Claw Router vendor routing. */
export interface AnthropicCountMessageTokensResponse {
  /** Total input token count. */
  input_tokens: number;
}
