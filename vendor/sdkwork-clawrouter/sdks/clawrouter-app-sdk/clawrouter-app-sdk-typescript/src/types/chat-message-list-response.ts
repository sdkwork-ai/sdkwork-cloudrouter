import type { ChatMessageItem } from './chat-message-item';

/** Chat message list response schema exposed by Claw Router. */
export interface ChatMessageListResponse {
  /** Items field on chat message list response. */
  items: ChatMessageItem[];
}
