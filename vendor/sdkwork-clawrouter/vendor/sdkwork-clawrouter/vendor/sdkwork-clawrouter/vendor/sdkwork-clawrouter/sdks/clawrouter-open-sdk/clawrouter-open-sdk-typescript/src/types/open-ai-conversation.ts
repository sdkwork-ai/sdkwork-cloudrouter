import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation schema exposed by Claw Router. */
export interface OpenAiConversation {
  /** Unix timestamp in seconds when the conversation was created. */
  created_at: string;
  /** Conversation identifier. */
  id: string;
  /** Developer-defined metadata attached to the conversation. */
  metadata?: Record<string, string>;
  /** Object type, always conversation. */
  object: 'conversation';
}
