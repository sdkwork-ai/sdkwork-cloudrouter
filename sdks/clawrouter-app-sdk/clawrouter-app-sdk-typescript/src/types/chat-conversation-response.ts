import type { ChatConversationItem } from './chat-conversation-item';

/** Chat conversation response schema exposed by Claw Router. */
export interface ChatConversationResponse {
  /** Item field on chat conversation response. */
  item: ChatConversationItem;
}
