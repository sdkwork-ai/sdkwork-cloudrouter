import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to attach multiple files to a vector store. */
export interface OpenAiVectorStoreFileBatchCreateRequest {
  /** File attributes used for vector store filtering. */
  attributes?: Record<string, ProviderJsonValue>;
  /** Chunking strategy used to process the files. */
  chunking_strategy?: ProviderJsonValue;
  /** File identifiers to attach to the vector store. */
  file_ids: string[];
}
