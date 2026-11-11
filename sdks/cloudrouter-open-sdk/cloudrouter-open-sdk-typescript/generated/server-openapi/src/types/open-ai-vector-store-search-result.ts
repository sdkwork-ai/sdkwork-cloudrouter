import type { ProviderJsonValue } from './provider-json-value';

/** Single vector store search result. */
export interface OpenAiVectorStoreSearchResult {
  /** File attributes returned with the result. */
  attributes?: Record<string, ProviderJsonValue>;
  /** Matched text content chunks. */
  content?: ProviderJsonValue[];
  /** Matched file identifier. */
  file_id?: string;
  /** Matched filename. */
  filename?: string;
  /** Search relevance score. */
  score?: number;
}
