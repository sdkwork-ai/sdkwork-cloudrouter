import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a vector store. */
export interface OpenAiVectorStoreUpdateRequest {
  /** Vector store expiration policy. */
  expires_after?: ProviderJsonValue;
  /** Developer-defined vector store metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable vector store name. */
  name?: string;
}
