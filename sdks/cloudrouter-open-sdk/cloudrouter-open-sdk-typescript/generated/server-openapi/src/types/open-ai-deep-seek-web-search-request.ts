import type { ProviderJsonValue } from './provider-json-value';

/** DeepSeek-compatible web search request. */
export interface OpenAiDeepSeekWebSearchRequest {
  /** Number of results to return; does not change the per-request price. */
  count?: number;
  /** Optional IP address used to prefer localized search results. */
  localization?: string;
  /** Whether to return full page content in each result's content field. When false, content is always an empty string. */
  need_content?: boolean;
  /** The user's original question that triggered the search, used to improve query understanding. A null value is treated as absent. */
  ori_question?: string | null;
  /** Search query of 1 to 128 Unicode characters, not all whitespace. Supports the site:, -site:, -term, -"exact phrase", "exact phrase", lang:, after: and before: operators, which are forwarded unchanged. */
  query: string;
}
