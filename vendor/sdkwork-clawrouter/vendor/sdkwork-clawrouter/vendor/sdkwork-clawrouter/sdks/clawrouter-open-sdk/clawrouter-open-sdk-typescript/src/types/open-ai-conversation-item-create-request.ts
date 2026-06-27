import type { OpenAiConversationContentPart } from './open-ai-conversation-content-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation item create request schema exposed by Claw Router. */
export interface OpenAiConversationItemCreateRequest {
  /** Text or multimodal content parts for the item. */
  content?: OpenAiConversationContentPart[];
  /** Developer-defined metadata attached to the item. */
  metadata?: Record<string, string>;
  /** Message role when the item represents a message. */
  role?: string;
  /** Conversation item type, such as message, reasoning, tool_call, or provider-specific item type. */
  type: string;
}
