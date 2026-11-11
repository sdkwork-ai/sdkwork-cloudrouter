import type { ProviderJsonValue } from './provider-json-value';

/** DeepSeek-compatible fetched page: title plus Markdown body. */
export interface OpenAiDeepSeekWebFetchResponse {
  /** Extracted page body rendered as Markdown. A response whose body could not be extracted is never billed, which is why an empty body is a free call rather than a chargeable one. */
  content: string;
  /** Page title; an empty string when the page declares none. */
  title: string;
}
