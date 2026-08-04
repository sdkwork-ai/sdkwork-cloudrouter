import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a batch. */
export interface OpenAiBatchCreateRequest {
  /** Time window in which the batch should be processed. */
  completion_window: string;
  /** OpenAI-compatible endpoint to process. */
  endpoint: string;
  /** Uploaded file identifier containing batch requests. */
  input_file_id: string;
  /** Developer-defined batch metadata. */
  metadata?: Record<string, ProviderJsonValue>;
}
