import type { ChatConversationItem } from './chat-conversation-item';

/** Conversations retrieve result schema exposed by Claw Router. */
export interface ConversationsRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on conversations retrieve result. */
  data?: ChatConversationItem;
  /** Human-readable response message. */
  msg?: string;
}
