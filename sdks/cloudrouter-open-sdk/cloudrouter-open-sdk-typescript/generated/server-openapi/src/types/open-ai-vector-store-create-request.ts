import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a vector store. */
export interface OpenAiVectorStoreCreateRequest {
  /** Chunking strategy used to process attached files. */
  chunking_strategy?: ProviderJsonValue;
  /** Vector store expiration policy. */
  expires_after?: ProviderJsonValue;
  /** File identifiers to attach to the vector store. */
  file_ids?: string[];
  /** Developer-defined vector store metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable vector store name. */
  name?: string;
}
