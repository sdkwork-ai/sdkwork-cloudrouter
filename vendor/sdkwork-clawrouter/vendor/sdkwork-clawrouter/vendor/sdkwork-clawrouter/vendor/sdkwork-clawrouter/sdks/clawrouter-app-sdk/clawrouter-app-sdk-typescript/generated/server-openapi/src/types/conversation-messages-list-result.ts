import type { ChatMessageListResponse } from './chat-message-list-response';

/** Conversation messages list result schema exposed by Claw Router. */
export interface ConversationMessagesListResult {
  /** Business response code. */
  code: string;
  /** Data field on conversation messages list result. */
  data?: ChatMessageListResponse;
  /** Human-readable response message. */
  msg?: string;
}
