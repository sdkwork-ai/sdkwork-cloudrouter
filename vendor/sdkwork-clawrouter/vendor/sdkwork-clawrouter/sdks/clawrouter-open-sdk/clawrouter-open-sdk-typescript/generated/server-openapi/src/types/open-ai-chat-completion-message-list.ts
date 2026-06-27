import type { OpenAiChatMessage } from './open-ai-chat-message';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of chat completion messages. */
export interface OpenAiChatCompletionMessageList {
  /** Chat completion messages in the returned page. */
  data: OpenAiChatMessage[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
