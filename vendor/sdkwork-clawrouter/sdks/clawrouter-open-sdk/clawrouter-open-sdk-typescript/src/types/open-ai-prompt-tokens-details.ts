import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai prompt tokens details schema exposed by Claw Router. */
export interface OpenAiPromptTokensDetails {
  /** Number of input audio tokens. */
  audio_tokens?: number;
  /** Number of input tokens served from cache. */
  cached_tokens?: number;
}
