import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a thread run. */
export interface OpenAiRunUpdateRequest {
  /** Developer-defined run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
}
