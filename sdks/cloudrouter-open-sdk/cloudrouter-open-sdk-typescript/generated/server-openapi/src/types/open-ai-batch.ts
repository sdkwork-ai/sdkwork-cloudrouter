import type { OpenAiBatchRequestCounts } from './open-ai-batch-request-counts';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible batch object. */
export interface OpenAiBatch {
  /** Unix timestamp in seconds when the batch was cancelled. */
  cancelled_at?: string;
  /** Unix timestamp in seconds when cancellation started. */
  cancelling_at?: string;
  /** Unix timestamp in seconds when the batch completed. */
  completed_at?: string;
  /** Time window in which the batch should be processed. */
  completion_window: string;
  /** Unix timestamp in seconds when the batch was created. */
  created_at?: string;
  /** Endpoint processed by the batch. */
  endpoint: string;
  /** Error file identifier produced by the batch. */
  error_file_id?: string;
  /** Batch error list or envelope when returned. */
  errors?: ProviderJsonValue;
  /** Unix timestamp in seconds when the batch expired. */
  expired_at?: string;
  /** Unix timestamp in seconds when the batch expires. */
  expires_at?: string;
  /** Unix timestamp in seconds when the batch failed. */
  failed_at?: string;
  /** Unix timestamp in seconds when the batch started finalizing. */
  finalizing_at?: string;
  /** Batch identifier. */
  id: string;
  /** Unix timestamp in seconds when the batch started. */
  in_progress_at?: string;
  /** Input file identifier containing batch requests. */
  input_file_id: string;
  /** Developer-defined batch metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally batch. */
  object: 'batch';
  /** Output file identifier produced by the batch. */
  output_file_id?: string;
  /** Request counts field on the open ai batch, using the open ai batch request counts module. */
  request_counts?: OpenAiBatchRequestCounts;
  /** Batch processing status. */
  status: string;
}
