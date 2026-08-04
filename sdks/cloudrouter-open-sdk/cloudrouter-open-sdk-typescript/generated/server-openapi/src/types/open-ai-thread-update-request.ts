import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a thread. */
export interface OpenAiThreadUpdateRequest {
  /** Developer-defined thread metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Resources available to assistant tools. */
  tool_resources?: ProviderJsonValue;
}
