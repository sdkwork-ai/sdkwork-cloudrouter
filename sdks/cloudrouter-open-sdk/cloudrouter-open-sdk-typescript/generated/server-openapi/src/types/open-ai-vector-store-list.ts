import type { OpenAiVectorStore } from './open-ai-vector-store';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of vector stores. */
export interface OpenAiVectorStoreList {
  /** Vector stores in the returned page. */
  data: OpenAiVectorStore[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
