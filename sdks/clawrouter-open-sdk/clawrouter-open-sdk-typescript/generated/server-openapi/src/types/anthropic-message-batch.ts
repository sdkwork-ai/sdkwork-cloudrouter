import type { AnthropicMessageBatchRequestCounts } from './anthropic-message-batch-request-counts';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message batch schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageBatch {
  /** Time cancellation began. */
  cancel_initiated_at?: string | null;
  /** Time the batch was created. */
  created_at?: string;
  /** Time the batch ended. */
  ended_at?: string | null;
  /** Time the batch expires. */
  expires_at?: string;
  /** Message batch identifier. */
  id: string;
  /** Batch processing status. */
  processing_status: string;
  /** Request counts field on the anthropic message batch, using the anthropic message batch request counts module. */
  request_counts: AnthropicMessageBatchRequestCounts;
  /** URL for batch results when available. */
  results_url?: string | null;
  /** Object type, always message_batch. */
  type: 'message_batch';
}
