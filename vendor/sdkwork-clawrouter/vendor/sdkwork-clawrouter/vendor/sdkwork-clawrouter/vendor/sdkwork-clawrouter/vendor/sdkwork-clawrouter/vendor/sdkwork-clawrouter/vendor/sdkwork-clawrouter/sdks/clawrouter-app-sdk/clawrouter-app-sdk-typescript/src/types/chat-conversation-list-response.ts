import type { ChatConversationItem } from './chat-conversation-item';

/** Chat conversation list response schema exposed by Claw Router. */
export interface ChatConversationListResponse {
  /** Items field on chat conversation list response. */
  items: ChatConversationItem[];
}
