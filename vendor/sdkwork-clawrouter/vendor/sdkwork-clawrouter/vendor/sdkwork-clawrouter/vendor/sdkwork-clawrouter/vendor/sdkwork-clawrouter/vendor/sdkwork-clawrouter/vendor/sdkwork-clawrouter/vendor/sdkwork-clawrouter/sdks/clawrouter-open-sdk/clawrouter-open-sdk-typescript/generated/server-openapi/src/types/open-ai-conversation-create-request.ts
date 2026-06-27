import type { OpenAiConversationItemCreateRequest } from './open-ai-conversation-item-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation create request schema exposed by Claw Router. */
export interface OpenAiConversationCreateRequest {
  /** Initial input items to add to the conversation. */
  items?: OpenAiConversationItemCreateRequest[];
  /** Developer-defined metadata attached to the conversation. */
  metadata?: Record<string, string>;
}
