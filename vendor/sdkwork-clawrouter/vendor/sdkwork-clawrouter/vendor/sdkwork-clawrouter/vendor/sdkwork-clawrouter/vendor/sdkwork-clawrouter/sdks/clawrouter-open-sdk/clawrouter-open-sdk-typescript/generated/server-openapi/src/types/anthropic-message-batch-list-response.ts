import type { AnthropicMessageBatch } from './anthropic-message-batch';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message batch list response schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageBatchListResponse {
  /** Message batch objects. */
  data: AnthropicMessageBatch[];
  /** First object identifier in the page. */
  first_id?: string | null;
  /** Whether more results are available. */
  has_more?: boolean;
  /** Last object identifier in the page. */
  last_id?: string | null;
}
