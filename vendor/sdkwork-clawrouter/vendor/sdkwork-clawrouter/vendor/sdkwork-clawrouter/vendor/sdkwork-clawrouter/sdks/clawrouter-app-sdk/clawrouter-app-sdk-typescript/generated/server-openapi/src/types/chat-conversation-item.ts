/** Chat conversation item schema exposed by Claw Router. */
export interface ChatConversationItem {
  /** Agent id field on chat conversation item. */
  agentId?: string | null;
  /** Agent session id field on chat conversation item. */
  agentSessionId?: string | null;
  /** Created at field on chat conversation item. */
  createdAt: string;
  /** Default model field on chat conversation item. */
  defaultModel?: string | null;
  /** Default provider field on chat conversation item. */
  defaultProvider?: string | null;
  /** Id field on chat conversation item. */
  id: string;
  /** Last message preview field on chat conversation item. */
  lastMessagePreview?: string | null;
  /** Memory space id field on chat conversation item. */
  memorySpaceId?: string | null;
  /** Message count field on chat conversation item. */
  messageCount: string;
  /** Source surface field on chat conversation item. */
  sourceSurface: string;
  /** Status field on chat conversation item. */
  status: 'active' | 'archived' | 'deleted';
  /** Title field on chat conversation item. */
  title: string;
  /** Turn count field on chat conversation item. */
  turnCount: string;
  /** Updated at field on chat conversation item. */
  updatedAt: string;
}
