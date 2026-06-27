import type { AnthropicMessageCreateRequest } from './anthropic-message-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message batch request schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageBatchRequest {
  /** Caller-provided request identifier. */
  custom_id: string;
  /** Params field on the anthropic message batch request, using the anthropic message create request module. */
  params: AnthropicMessageCreateRequest;
}
