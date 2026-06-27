import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google usage metadata schema exposed by Claw Router vendor routing. */
export interface GoogleUsageMetadata {
  /** Cached content token count. */
  cachedContentTokenCount?: number;
  /** Candidate output token count. */
  candidatesTokenCount?: number;
  /** Input token count. */
  promptTokenCount?: number;
  /** Thinking token count. */
  thoughtsTokenCount?: number;
  /** Total token count. */
  totalTokenCount?: number;
}
