import type { GoogleContent } from './google-content';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google embed content request schema exposed by Cloud Router vendor routing. */
export interface GoogleEmbedContentRequest {
  /** Content field on the google embed content request, using the google content module. */
  content: GoogleContent;
  /** Configurations for the embed request. */
  embedContentConfig?: Record<string, ProviderJsonValue>;
  /** Model resource name, `models/{model}`. */
  model?: string;
  /** Deprecated: use `embedContentConfig.outputDimensionality` instead. */
  outputDimensionality?: number;
  /** Embedding task type (deprecated in favor of `embedContentConfig.taskType`). */
  taskType?: 'TASK_TYPE_UNSPECIFIED' | 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING' | 'QUESTION_ANSWERING' | 'FACT_VERIFICATION' | 'CODE_RETRIEVAL_QUERY';
  /** Deprecated: use `embedContentConfig.title` instead. */
  title?: string;
}
