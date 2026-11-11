import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible vector store file object. */
export interface OpenAiVectorStoreFile {
  /** File attributes used for vector store filtering. */
  attributes?: Record<string, ProviderJsonValue>;
  /** Chunking strategy applied to this file. */
  chunking_strategy?: ProviderJsonValue;
  /** Unix timestamp in seconds when the vector store file was created. */
  created_at: string;
  /** Vector store file identifier. */
  id: string;
  /** Last processing error returned by the upstream. */
  last_error?: ProviderJsonValue;
  /** Object type, normally vector_store.file. */
  object: 'vector_store.file';
  /** Vector store file processing status. */
  status: string;
  /** Storage used by the vector store file in bytes. */
  usage_bytes?: string;
  /** Vector store identifier that owns this file. */
  vector_store_id: string;
}
