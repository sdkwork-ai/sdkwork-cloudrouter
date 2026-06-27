import type { OpenAiConversationItem } from './open-ai-conversation-item';

/** OpenAI-compatible open ai conversation item list schema exposed by Claw Router. */
export interface OpenAiConversationItemList {
  /** Conversation items in the requested page. */
  data: OpenAiConversationItem[];
  /** Identifier of the first object in the page. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in the page. */
  last_id?: string | null;
  /** Object type, always list. */
  object: 'list';
}
