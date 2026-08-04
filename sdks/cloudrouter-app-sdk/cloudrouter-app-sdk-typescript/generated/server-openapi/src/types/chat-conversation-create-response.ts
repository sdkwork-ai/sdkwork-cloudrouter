import type { ChatConversationItem } from './chat-conversation-item';

/** Chat conversation create response schema exposed by Cloud Router. */
export interface ChatConversationCreateResponse {
  /** Item field on chat conversation create response. */
  item: ChatConversationItem;
}
