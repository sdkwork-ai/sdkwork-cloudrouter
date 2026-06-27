/** Chat message item schema exposed by Claw Router. */
export interface ChatMessageItem {
  /** Content field on chat message item. */
  content: string;
  /** Conversation id field on chat message item. */
  conversationId: string;
  /** Created at field on chat message item. */
  createdAt: string;
  /** Direction field on chat message item. */
  direction: 'input' | 'output';
  /** Id field on chat message item. */
  id: string;
  /** Model field on chat message item. */
  model?: string | null;
  /** Provider field on chat message item. */
  provider?: string | null;
  /** Role field on chat message item. */
  role: 'system' | 'user' | 'assistant' | 'tool' | 'developer';
  /** Runtime field on chat message item. */
  runtime?: string | null;
  /** Runtime invocation id field on chat message item. */
  runtimeInvocationId?: string | null;
  /** Status field on chat message item. */
  status: 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'deleted';
  /** Turn id field on chat message item. */
  turnId?: string | null;
  /** Usage field on chat message item. */
  usage?: Record<string, unknown> | null;
  /** Usage link id field on chat message item. */
  usageLinkId?: string | null;
}
