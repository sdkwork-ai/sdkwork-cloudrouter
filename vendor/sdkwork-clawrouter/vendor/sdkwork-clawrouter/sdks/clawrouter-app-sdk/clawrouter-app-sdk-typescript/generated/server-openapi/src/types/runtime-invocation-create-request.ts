import type { JsonValue } from './json-value';

/** Runtime invocation create request schema exposed by Claw Router. */
export interface RuntimeInvocationCreateRequest {
  /** Agent run id field on runtime invocation create request. */
  agentRunId?: string;
  /** Agent run step id field on runtime invocation create request. */
  agentRunStepId?: string;
  /** Agent session id field on runtime invocation create request. */
  agentSessionId?: string;
  /** Approval policy field on runtime invocation create request. */
  approvalPolicy?: string;
  /** Chat item id field on runtime invocation create request. */
  chatItemId?: string;
  /** Chat turn id field on runtime invocation create request. */
  chatTurnId?: string;
  /** Conversation id field on runtime invocation create request. */
  conversationId?: string;
  /** Cwd field on runtime invocation create request. */
  cwd?: string;
  /** Endpoint field on runtime invocation create request. */
  endpoint?: string;
  /** Invocation type field on runtime invocation create request. */
  invocationType?: string;
  /** Metadata field on runtime invocation create request. */
  metadata?: Record<string, JsonValue>;
  /** Model field on runtime invocation create request. */
  model?: string;
  /** Permission mode field on runtime invocation create request. */
  permissionMode?: string;
  /** Provider field on runtime invocation create request. */
  provider?: string;
  /** Request json field on runtime invocation create request. */
  requestJson?: Record<string, JsonValue>;
  /** Runtime field on runtime invocation create request. */
  runtime: string;
  /** Sandbox policy field on runtime invocation create request. */
  sandboxPolicy?: string;
  /** Status field on runtime invocation create request. */
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  /** Streaming field on runtime invocation create request. */
  streaming?: boolean;
  /** Tool call id field on runtime invocation create request. */
  toolCallId?: string;
  /** Tool name field on runtime invocation create request. */
  toolName?: string;
  /** Trace id field on runtime invocation create request. */
  traceId?: string;
}
