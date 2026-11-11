import type { OpenAiThreadMessageCreateRequest } from './open-ai-thread-message-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread run. */
export interface OpenAiRunCreateRequest {
  /** Additional instructions appended for this run. */
  additional_instructions?: string;
  /** Messages appended to the thread before the run starts. */
  additional_messages?: OpenAiThreadMessageCreateRequest[];
  /** Assistant identifier used by the run. */
  assistant_id: string;
  /** Instructions applied to the run. */
  instructions?: string;
  /** Maximum completion tokens. */
  max_completion_tokens?: number;
  /** Maximum prompt tokens before truncation. */
  max_prompt_tokens?: number;
  /** Developer-defined run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model override used by the run. */
  model?: string;
  /** Whether the model may call tools in parallel. */
  parallel_tool_calls?: boolean;
  /** Reasoning effort for reasoning models. */
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Run response format configuration. */
  response_format?: ProviderJsonValue;
  /** Whether to stream run events. */
  stream?: boolean;
  /** Sampling temperature. */
  temperature?: number;
  /** Tool choice configuration. */
  tool_choice?: ProviderJsonValue;
  /** Tool definitions available to the run. */
  tools?: ProviderJsonValue[];
  /** Nucleus sampling probability mass. */
  top_p?: number;
  /** Context truncation strategy. */
  truncation_strategy?: ProviderJsonValue;
}
