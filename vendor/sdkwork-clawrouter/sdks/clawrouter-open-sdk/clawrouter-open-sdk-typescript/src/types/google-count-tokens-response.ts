import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google count tokens response schema exposed by Claw Router vendor routing. */
export interface GoogleCountTokensResponse {
  /** Cached content token count. */
  cachedContentTokenCount?: number;
  /** Total token count. */
  totalTokens?: number;
}
