/** Chat turn item schema exposed by Claw Router. */
export interface ChatTurnItem {
  /** Agent id field on chat turn item. */
  agentId: string | null;
  /** Agent session id field on chat turn item. */
  agentSessionId: string | null;
  /** Conversation id field on chat turn item. */
  conversationId: string;
  /** Created at field on chat turn item. */
  createdAt: string;
  /** Id field on chat turn item. */
  id: string;
  /** Model field on chat turn item. */
  model: string | null;
  /** Provider field on chat turn item. */
  provider: string | null;
  /** Status field on chat turn item. */
  status: string;
  /** Updated at field on chat turn item. */
  updatedAt: string;
}
