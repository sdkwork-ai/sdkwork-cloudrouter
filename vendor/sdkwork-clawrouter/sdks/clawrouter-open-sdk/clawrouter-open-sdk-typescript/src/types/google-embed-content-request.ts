import type { GoogleContent } from './google-content';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google embed content request schema exposed by Claw Router vendor routing. */
export interface GoogleEmbedContentRequest {
  /** Content field on the google embed content request, using the google content module. */
  content: GoogleContent;
  /** Requested embedding dimensionality. */
  outputDimensionality?: number;
  /** Embedding task type. */
  taskType?: string;
  /** Optional document title for retrieval embeddings. */
  title?: string;
}
