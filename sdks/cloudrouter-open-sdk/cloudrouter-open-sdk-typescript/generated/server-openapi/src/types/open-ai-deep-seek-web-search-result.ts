import type { ProviderJsonValue } from './provider-json-value';

/** One ranked DeepSeek web search result. */
export interface OpenAiDeepSeekWebSearchResult {
  /** Page authority from 0 to 4, where -1 means unknown. */
  authority: number;
  /** Full page content when need_content is true, otherwise empty. */
  content: string;
  /** Publication time in UTC RFC 3339 format, or null when unknown. */
  date: string | null;
  /** Relevance score from 0 to 3 combining relevance, authority and freshness; 1.5 or above is considered high quality. */
  rerank_score: number;
  /** Site icon URL, or null when unavailable. */
  site_icon: string | null;
  /** Site name, or null when unavailable. */
  site_name: string | null;
  /** Short query-relevant excerpt intended for display. */
  snippet: string;
  /** Longer query-relevant summary intended for model consumption. */
  summary: string;
  /** Result title. */
  title: string;
  /** Result URL. */
  url: string;
}
