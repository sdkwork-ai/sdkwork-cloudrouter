import type { OpenAiConversation } from './open-ai-conversation';

/** OpenAI-compatible open ai conversation list schema exposed by Claw Router. */
export interface OpenAiConversationList {
  /** Conversation objects in the requested page. */
  data: OpenAiConversation[];
  /** Identifier of the first object in the page. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in the page. */
  last_id?: string | null;
  /** Object type, always list. */
  object: 'list';
}
