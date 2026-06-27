import type { OpenAiVectorStoreSearchResult } from './open-ai-vector-store-search-result';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible vector store search response. */
export interface OpenAiVectorStoreSearchResponse {
  /** Vector store search results. */
  data?: OpenAiVectorStoreSearchResult[];
  /** Object type returned by the search endpoint. */
  object?: string;
  /** Queries used for the vector store search. */
  search_query?: string[];
}
