import type { ChatMessageItem } from './chat-message-item';
import type { PageInfo } from './page-info';

/** Chat message list response schema exposed by Claw Router. */
export interface ChatMessageListResponse {
  /** Items field on chat message list response. */
  items: ChatMessageItem[];
  /** Page info field on chat message list response. */
  pageInfo: PageInfo;
}
