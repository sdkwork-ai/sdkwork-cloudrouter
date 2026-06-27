import type { ChatConversationResponse } from './chat-conversation-response';

/** Conversations create result schema exposed by Claw Router. */
export interface ConversationsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on conversations create result. */
  data?: ChatConversationResponse;
  /** Human-readable response message. */
  msg?: string;
}
