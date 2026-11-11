import type { ProviderJsonValue } from './provider-json-value';

/** DeepSeek-compatible request to fetch a single web page as Markdown. */
export interface OpenAiDeepSeekWebFetchRequest {
  /** Absolute HTTP or HTTPS URL to fetch. Must contain a host, must not carry a username or password, and is limited to 8192 characters. */
  url: string;
}
