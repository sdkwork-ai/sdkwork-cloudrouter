import type { OpenAiVectorStoreFile } from './open-ai-vector-store-file';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of vector store files. */
export interface OpenAiVectorStoreFileList {
  /** Vector store files in the returned page. */
  data: OpenAiVectorStoreFile[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
