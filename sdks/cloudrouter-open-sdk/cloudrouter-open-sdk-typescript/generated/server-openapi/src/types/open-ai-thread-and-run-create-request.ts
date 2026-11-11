import type { OpenAiThreadCreateRequest } from './open-ai-thread-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread and start a run. */
export interface OpenAiThreadAndRunCreateRequest {
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
  /** Run response format configuration. */
  response_format?: ProviderJsonValue;
  /** Whether to stream run events. */
  stream?: boolean;
  /** Sampling temperature. */
  temperature?: number;
  /** Thread field on the open ai thread and run create request, using the open ai thread create request module. */
  thread?: OpenAiThreadCreateRequest;
  /** Tool choice configuration. */
  tool_choice?: ProviderJsonValue;
  /** Resources available to assistant tools. */
  tool_resources?: ProviderJsonValue;
  /** Tool definitions available to the run. */
  tools?: ProviderJsonValue[];
  /** Nucleus sampling probability mass. */
  top_p?: number;
  /** Context truncation strategy. */
  truncation_strategy?: ProviderJsonValue;
}
