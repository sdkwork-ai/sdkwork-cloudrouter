import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai embedding usage schema exposed by Cloud Router. */
export interface OpenAiEmbeddingUsage {
  /** Number of input tokens embedded. */
  prompt_tokens: number;
  /** Total token count for the embedding request. */
  total_tokens: number;
}
