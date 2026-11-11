import type { GoogleContentEmbedding } from './google-content-embedding';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google batch embed contents response schema exposed by Cloud Router vendor routing. */
export interface GoogleBatchEmbedContentsResponse {
  /** Embedding vectors in request order. */
  embeddings?: GoogleContentEmbedding[];
}
