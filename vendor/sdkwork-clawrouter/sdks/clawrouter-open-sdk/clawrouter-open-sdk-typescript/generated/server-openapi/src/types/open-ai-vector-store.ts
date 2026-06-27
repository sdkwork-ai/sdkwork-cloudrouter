import type { OpenAiVectorStoreFileCounts } from './open-ai-vector-store-file-counts';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible vector store object. */
export interface OpenAiVectorStore {
  /** Storage used by the vector store in bytes. */
  bytes?: string;
  /** Unix timestamp in seconds when the vector store was created. */
  created_at: string;
  /** Vector store expiration policy. */
  expires_after?: ProviderJsonValue;
  /** Unix timestamp in seconds when the vector store expires. */
  expires_at?: string;
  /** File counts field on the open ai vector store, using the open ai vector store file counts module. */
  file_counts?: OpenAiVectorStoreFileCounts;
  /** Vector store identifier. */
  id: string;
  /** Unix timestamp in seconds when the vector store was last active. */
  last_active_at?: string;
  /** Developer-defined vector store metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable vector store name. */
  name?: string;
  /** Object type, normally vector_store. */
  object: 'vector_store';
  /** Vector store processing status. */
  status: string;
  /** Storage used by the vector store in bytes. */
  usage_bytes?: string;
}
