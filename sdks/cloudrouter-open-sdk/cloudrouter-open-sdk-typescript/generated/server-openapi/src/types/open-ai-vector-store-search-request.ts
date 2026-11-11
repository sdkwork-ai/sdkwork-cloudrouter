import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to search a vector store. */
export interface OpenAiVectorStoreSearchRequest {
  /** Structured metadata filters for the vector store search. */
  filters?: ProviderJsonValue;
  /** Maximum number of search results to return. */
  max_num_results?: number;
  /** Search query text or structured query payload. */
  query: string | string[] | ProviderJsonValue[];
  /** Ranking options forwarded to compatible upstreams. */
  ranking_options?: ProviderJsonValue;
  /** Whether the upstream may rewrite the query. */
  rewrite_query?: boolean;
}
