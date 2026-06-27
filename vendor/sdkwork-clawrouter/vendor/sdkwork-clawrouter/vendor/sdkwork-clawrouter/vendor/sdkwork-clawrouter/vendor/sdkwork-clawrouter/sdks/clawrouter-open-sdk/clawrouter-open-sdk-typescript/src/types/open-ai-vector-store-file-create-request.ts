import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to attach a file to a vector store. */
export interface OpenAiVectorStoreFileCreateRequest {
  /** File attributes used for vector store filtering. */
  attributes?: Record<string, ProviderJsonValue>;
  /** Chunking strategy used to process the file. */
  chunking_strategy?: ProviderJsonValue;
  /** File identifier to attach to the vector store. */
  file_id: string;
}
