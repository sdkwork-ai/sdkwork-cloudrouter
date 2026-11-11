import type { OpenAiConversationContentPart } from './open-ai-conversation-content-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to add items to a conversation (`POST /v1/conversations/{conversation_id}/items`). */
export interface OpenAiConversationItemCreateRequest {
  /** Items to add to the conversation. */
  items: ({ content?: OpenAiConversationContentPart[]; role?: string; type: string; } & Record<string, ProviderJsonValue>)[];
}
