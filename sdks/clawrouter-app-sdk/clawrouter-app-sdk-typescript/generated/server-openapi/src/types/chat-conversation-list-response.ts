import type { ChatConversationItem } from './chat-conversation-item';
import type { PageInfo } from './page-info';

/** Chat conversation list response schema exposed by Claw Router. */
export interface ChatConversationListResponse {
  /** Items field on chat conversation list response. */
  items: ChatConversationItem[];
  /** Page info field on chat conversation list response. */
  pageInfo: PageInfo;
}
