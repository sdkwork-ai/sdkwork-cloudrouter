import type { OpenAiResponseInputItem } from './open-ai-response-input-item';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to count tokens for a Responses API input (`POST /v1/responses/input_tokens`). Supply `input` or `previous_response_id`. */
export interface OpenAiResponseInputTokenCountRequest {
  /** Conversation reference or inline conversation. */
  conversation?: ProviderJsonValue;
  /** Responses API input to count. */
  input?: string | OpenAiResponseInputItem[];
  /** Optional system or developer instructions included in the count. */
  instructions?: string;
  /** Model id or Cloud Router catalog key used for token counting. */
  model?: string;
  /** Whether the model may call tools in parallel. */
  parallel_tool_calls?: boolean;
  /** Personality or style configuration. */
  personality?: ProviderJsonValue;
  /** Count the input of a stored previous response instead of a fresh input. */
  previous_response_id?: string;
  /** Reasoning configuration. */
  reasoning?: ProviderJsonValue;
  /** Text output configuration. */
  text?: ProviderJsonValue;
  /** Tool choice configuration. */
  tool_choice?: ProviderJsonValue;
  /** Tools included in the count when supported. */
  tools?: ProviderJsonValue[];
  /** Truncation strategy. */
  truncation?: 'auto' | 'disabled';
}
