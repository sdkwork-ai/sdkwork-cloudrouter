import type { GoogleContentEmbedding } from './google-content-embedding';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google embed content response schema exposed by Claw Router vendor routing. */
export interface GoogleEmbedContentResponse {
  /** Embedding field on the google embed content response, using the google content embedding module. */
  embedding?: GoogleContentEmbedding;
}
