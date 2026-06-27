import type { OpenAiChatMessage } from './open-ai-chat-message';
import type { OpenAiChoiceLogprobs } from './open-ai-choice-logprobs';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat completion choice schema exposed by Claw Router. */
export interface OpenAiChatCompletionChoice {
  /** Reason generation finished, such as stop, length, content_filter, or tool_calls. */
  finish_reason?: string;
  /** Choice index in the response. */
  index: number;
  /** Logprobs field on the open ai chat completion choice, using the open ai choice logprobs module. */
  logprobs?: OpenAiChoiceLogprobs;
  /** Message field on the open ai chat completion choice, using the open ai chat message module. */
  message: OpenAiChatMessage;
}
