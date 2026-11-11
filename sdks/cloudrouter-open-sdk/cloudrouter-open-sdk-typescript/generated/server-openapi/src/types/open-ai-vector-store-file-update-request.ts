import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update vector store file attributes. */
export interface OpenAiVectorStoreFileUpdateRequest {
  /** File attributes used for vector store filtering. */
  attributes?: Record<string, ProviderJsonValue>;
}
