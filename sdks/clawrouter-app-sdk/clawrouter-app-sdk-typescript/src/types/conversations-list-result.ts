import type { ChatConversationListResponse } from './chat-conversation-list-response';

/** Conversations list result schema exposed by Claw Router. */
export interface ConversationsListResult {
  /** Business response code. */
  code: string;
  /** Data field on conversations list result. */
  data?: ChatConversationListResponse;
  /** Human-readable response message. */
  msg?: string;
}
