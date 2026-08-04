import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response input tokens details schema exposed by Cloud Router. */
export interface OpenAiResponseInputTokensDetails {
  /** Input tokens served from cache. */
  cached_tokens?: number;
}
