import type { OpenAiConversationContentPart } from './open-ai-conversation-content-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation item schema exposed by Claw Router. */
export interface OpenAiConversationItem {
  /** Text or multimodal content parts for the item. */
  content?: OpenAiConversationContentPart[];
  /** Unix timestamp in seconds when the item was created. */
  created_at?: string;
  /** Conversation item identifier. */
  id: string;
  /** Developer-defined metadata attached to the item. */
  metadata?: Record<string, string>;
  /** Object type, always conversation.item. */
  object: 'conversation.item';
  /** Message role when the item represents a message. */
  role?: string;
  /** Provider item status when returned by the upstream. */
  status?: string;
  /** Conversation item type. */
  type: string;
}
