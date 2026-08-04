import type { OpenAiResponseInputTokensDetails } from './open-ai-response-input-tokens-details';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible response input token count result. */
export interface OpenAiResponseInputTokenCount {
  /** Number of input tokens counted. */
  input_tokens: number;
  /** Input tokens details field on the open ai response input token count, using the open ai response input tokens details module. */
  input_tokens_details?: OpenAiResponseInputTokensDetails;
  /** Model used for token counting. */
  model?: string;
  /** Object type returned by the token count endpoint. */
  object?: string;
}
