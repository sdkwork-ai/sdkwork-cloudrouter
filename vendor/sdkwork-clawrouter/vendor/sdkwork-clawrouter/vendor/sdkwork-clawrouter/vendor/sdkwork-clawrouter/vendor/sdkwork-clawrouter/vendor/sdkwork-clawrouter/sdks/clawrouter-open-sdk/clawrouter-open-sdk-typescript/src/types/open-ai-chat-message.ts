import type { OpenAiChatContentPart } from './open-ai-chat-content-part';
import type { OpenAiFunctionCall } from './open-ai-function-call';
import type { OpenAiToolCall } from './open-ai-tool-call';
import type { ProviderJsonNull } from './provider-json-null';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat message schema exposed by Claw Router. */
export interface OpenAiChatMessage {
  /** Message content as plain text, multimodal content parts, or null for tool call messages. */
  content?: string | OpenAiChatContentPart[] | ProviderJsonNull;
  /** Function call field on the open ai chat message, using the open ai function call module. */
  function_call?: OpenAiFunctionCall;
  /** Optional participant name for the message. */
  name?: string;
  /** Refusal text emitted by compatible upstreams. */
  refusal?: string;
  /** Message role, such as developer, system, user, assistant, tool, or function. */
  role: 'developer' | 'system' | 'user' | 'assistant' | 'tool' | 'function';
  /** Tool call identifier that this tool message answers. */
  tool_call_id?: string;
  /** Tool calls requested by an assistant message. */
  tool_calls?: OpenAiToolCall[];
}
