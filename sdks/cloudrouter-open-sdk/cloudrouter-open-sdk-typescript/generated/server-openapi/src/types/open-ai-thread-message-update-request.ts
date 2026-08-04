import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a thread message. */
export interface OpenAiThreadMessageUpdateRequest {
  /** Developer-defined message metadata. */
  metadata?: Record<string, ProviderJsonValue>;
}
