import type { OpenAiConversationReference } from './open-ai-conversation-reference';
import type { OpenAiPromptReference } from './open-ai-prompt-reference';
import type { OpenAiReasoningConfig } from './open-ai-reasoning-config';
import type { OpenAiResponseInputItem } from './open-ai-response-input-item';
import type { OpenAiTextConfig } from './open-ai-text-config';
import type { OpenAiTool } from './open-ai-tool';
import type { OpenAiToolChoice } from './open-ai-tool-choice';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai responses request schema exposed by Claw Router. */
export interface OpenAiResponsesRequest {
  /** Whether the response may run in the background when supported. */
  background?: boolean;
  /** Conversation identifier or object for stateful response creation. */
  conversation?: string | OpenAiConversationReference;
  /** Additional response fields to include. */
  include?: string[];
  /** Text or structured multimodal input items for the Responses API. */
  input: string | OpenAiResponseInputItem[];
  /** System or developer instructions for the response. */
  instructions?: string;
  /** Maximum number of output tokens to generate. */
  max_output_tokens?: number;
  /** Maximum number of tool calls the model may make. */
  max_tool_calls?: number;
  /** Developer-defined metadata attached to the response. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model id or Claw Router catalog key routed to a provider account. */
  model: string;
  /** Whether compatible upstreams may issue parallel tool calls. */
  parallel_tool_calls?: boolean;
  /** Previous response identifier for chained responses. */
  previous_response_id?: string;
  /** Prompt field on the open ai responses request, using the open ai prompt reference module. */
  prompt?: OpenAiPromptReference;
  /** Application supplied cache key for prompt caching. */
  prompt_cache_key?: string;
  /** Reasoning field on the open ai responses request, using the open ai reasoning config module. */
  reasoning?: OpenAiReasoningConfig;
  /** Requested upstream service tier when supported. */
  service_tier?: 'auto' | 'default' | 'flex' | 'priority';
  /** Whether the upstream should store the response. */
  store?: boolean;
  /** Whether to stream response events. */
  stream?: boolean;
  /** Sampling temperature. */
  temperature?: number;
  /** Text field on the open ai responses request, using the open ai text config module. */
  text?: OpenAiTextConfig;
  /** Tool choice field on the open ai responses request, using the open ai tool choice module. */
  tool_choice?: OpenAiToolChoice;
  /** Tools available to the model. */
  tools?: OpenAiTool[];
  /** Number of likely token options to include when logprobs are requested. */
  top_logprobs?: number;
  /** Nucleus sampling probability mass. */
  top_p?: number;
  /** Input truncation strategy for long context requests. */
  truncation?: 'auto' | 'disabled';
  /** End-user identifier forwarded to compatible upstreams. */
  user?: string;
}
