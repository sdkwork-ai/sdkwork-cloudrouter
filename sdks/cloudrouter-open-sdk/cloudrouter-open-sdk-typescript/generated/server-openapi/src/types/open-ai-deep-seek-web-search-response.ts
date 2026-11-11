import type { OpenAiDeepSeekWebSearchResult } from './open-ai-deep-seek-web-search-result';
import type { ProviderJsonValue } from './provider-json-value';

/** DeepSeek-compatible web search response. */
export interface OpenAiDeepSeekWebSearchResponse {
  /** Ranked search results; empty when the search matched nothing. An empty array is a successful but unbilled request. */
  results: OpenAiDeepSeekWebSearchResult[];
}
