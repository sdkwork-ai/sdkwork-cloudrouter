import type { ProviderJsonValue } from './provider-json-value';

/** Type safe usage schema exposed by Cloud Router. */
export interface TypeSafeUsage {
  /** Input token count. System One bills on input tokens. */
  input_tokens?: number;
  /** Output token count reported by the endpoint. */
  output_tokens?: number;
}
