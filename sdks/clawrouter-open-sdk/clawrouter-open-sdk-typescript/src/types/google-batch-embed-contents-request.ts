import type { GoogleEmbedContentRequest } from './google-embed-content-request';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google batch embed contents request schema exposed by Claw Router vendor routing. */
export interface GoogleBatchEmbedContentsRequest {
  /** Embedding requests to run as a batch. */
  requests: GoogleEmbedContentRequest[];
}
