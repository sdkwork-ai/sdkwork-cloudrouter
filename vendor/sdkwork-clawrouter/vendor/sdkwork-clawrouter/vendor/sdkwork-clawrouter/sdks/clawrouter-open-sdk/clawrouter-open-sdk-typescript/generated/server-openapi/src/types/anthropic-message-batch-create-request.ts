import type { AnthropicMessageBatchRequest } from './anthropic-message-batch-request';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message batch create request schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageBatchCreateRequest {
  /** Message requests to execute as a batch. */
  requests: AnthropicMessageBatchRequest[];
}
