import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to compact response or conversation state (`POST /v1/responses/compact`). */
export interface OpenAiResponseCompactRequest {
  /** Image context compression options, for example `{context_compression: auto}`. */
  image?: Record<string, ProviderJsonValue>;
  /** Responses API input, response state, or conversation state to compact. */
  input?: ProviderJsonValue;
  /** System or developer instructions applied before compaction. */
  instructions?: string;
  /** Model id or Cloud Router catalog key used for compaction. */
  model: string;
  /** Previous response identifier to compact from. */
  previous_response_id?: string;
  /** Prompt cache key. */
  prompt_cache_key?: string;
  /** Prompt cache options. */
  prompt_cache_options?: Record<string, ProviderJsonValue>;
  /** How long to retain the prompt cache entry. */
  prompt_cache_retention?: 'in_memory' | '24h';
  /** Processing service tier. */
  service_tier?: 'auto' | 'default' | 'fast' | 'flex' | 'priority';
}
