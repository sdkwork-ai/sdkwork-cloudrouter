import type { OpenAiVectorStoreFileCounts } from './open-ai-vector-store-file-counts';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible vector store file batch object. */
export interface OpenAiVectorStoreFileBatch {
  /** Unix timestamp in seconds when the batch was created. */
  created_at: string;
  /** File counts field on the open ai vector store file batch, using the open ai vector store file counts module. */
  file_counts?: OpenAiVectorStoreFileCounts;
  /** Vector store file batch identifier. */
  id: string;
  /** Object type, normally vector_store.file_batch. */
  object: 'vector_store.file_batch';
  /** Vector store file batch processing status. */
  status: string;
  /** Vector store identifier that owns this batch. */
  vector_store_id: string;
}
