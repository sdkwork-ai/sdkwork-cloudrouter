import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update stored chat completion metadata. */
export interface OpenAiChatCompletionUpdateRequest {
  /** Replacement developer-defined metadata for the stored chat completion. */
  metadata?: Record<string, ProviderJsonValue>;
}
