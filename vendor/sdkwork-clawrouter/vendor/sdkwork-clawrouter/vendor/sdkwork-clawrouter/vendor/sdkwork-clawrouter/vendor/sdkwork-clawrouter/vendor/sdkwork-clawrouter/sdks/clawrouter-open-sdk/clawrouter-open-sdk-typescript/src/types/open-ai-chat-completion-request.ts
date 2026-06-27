import type { OpenAiChatAudioConfig } from './open-ai-chat-audio-config';
import type { OpenAiChatMessage } from './open-ai-chat-message';
import type { OpenAiFunctionCallChoice } from './open-ai-function-call-choice';
import type { OpenAiFunctionDefinition } from './open-ai-function-definition';
import type { OpenAiPredictionConfig } from './open-ai-prediction-config';
import type { OpenAiResponseFormat } from './open-ai-response-format';
import type { OpenAiStreamOptions } from './open-ai-stream-options';
import type { OpenAiTool } from './open-ai-tool';
import type { OpenAiToolChoice } from './open-ai-tool-choice';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat completion request schema exposed by Claw Router. */
export interface OpenAiChatCompletionRequest {
  /** Audio field on the open ai chat completion request, using the open ai chat audio config module. */
  audio?: OpenAiChatAudioConfig;
  /** Penalty applied to repeated tokens. */
  frequency_penalty?: number;
  /** Function call field on the open ai chat completion request, using the open ai function call choice module. */
  function_call?: OpenAiFunctionCallChoice;
  /** Legacy function definitions passed through for compatible upstreams. */
  functions?: OpenAiFunctionDefinition[];
  /** Token bias map keyed by token id. */
  logit_bias?: Record<string, number>;
  /** Whether to return token log probabilities when supported. */
  logprobs?: boolean;
  /** Upper bound for generated completion tokens. */
  max_completion_tokens?: number;
  /** Legacy upper bound for generated tokens. */
  max_tokens?: number;
  /** Conversation messages in OpenAI-compatible chat format. */
  messages: OpenAiChatMessage[];
  /** Developer-defined metadata attached to the request. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Requested output modalities, such as text or audio. */
  modalities?: string[];
  /** Model id or Claw Router catalog key routed to a provider account. */
  model: string;
  /** Number of chat completion choices to generate. */
  n?: number;
  /** Whether tool calls may be executed in parallel by compatible upstreams. */
  parallel_tool_calls?: boolean;
  /** Prediction field on the open ai chat completion request, using the open ai prediction config module. */
  prediction?: OpenAiPredictionConfig;
  /** Penalty applied to new topic tokens. */
  presence_penalty?: number;
  /** Reasoning effort hint for reasoning models. */
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Response format field on the open ai chat completion request, using the open ai response format module. */
  response_format?: OpenAiResponseFormat;
  /** Best-effort deterministic sampling seed. */
  seed?: string;
  /** Requested upstream service tier when supported. */
  service_tier?: 'auto' | 'default' | 'flex' | 'priority';
  /** Stop sequence or list of stop sequences. */
  stop?: string | string[];
  /** Whether the upstream should store the chat completion when supported. */
  store?: boolean;
  /** Whether to stream chat completion chunks. */
  stream?: boolean;
  /** Stream options field on the open ai chat completion request, using the open ai stream options module. */
  stream_options?: OpenAiStreamOptions;
  /** Sampling temperature. */
  temperature?: number;
  /** Tool choice field on the open ai chat completion request, using the open ai tool choice module. */
  tool_choice?: OpenAiToolChoice;
  /** Tool definitions available to the model. */
  tools?: OpenAiTool[];
  /** Number of most likely tokens to return at each position. */
  top_logprobs?: number;
  /** Nucleus sampling probability mass. */
  top_p?: number;
  /** End-user identifier forwarded to compatible upstreams. */
  user?: string;
}
