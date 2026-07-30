import type { JsonValue } from './json-value';

/** Create runtime invocation request schema exposed by Claw Router. */
export interface CreateRuntimeInvocationRequest {
  /** Agent run id field on create runtime invocation request. */
  agentRunId?: string;
  /** Agent run step id field on create runtime invocation request. */
  agentRunStepId?: string;
  /** Agent session id field on create runtime invocation request. */
  agentSessionId?: string;
  /** Approval policy field on create runtime invocation request. */
  approvalPolicy?: string;
  /** Chat item id field on create runtime invocation request. */
  chatItemId?: string;
  /** Chat turn id field on create runtime invocation request. */
  chatTurnId?: string;
  /** Conversation id field on create runtime invocation request. */
  conversationId?: string;
  /** Cwd field on create runtime invocation request. */
  cwd?: string;
  /** Endpoint field on create runtime invocation request. */
  endpoint?: string;
  /** Invocation type field on create runtime invocation request. */
  invocationType?: string;
  /** Metadata field on create runtime invocation request. */
  metadata?: Record<string, JsonValue>;
  /** Model field on create runtime invocation request. */
  model?: string;
  /** Permission mode field on create runtime invocation request. */
  permissionMode?: string;
  /** Provider field on create runtime invocation request. */
  provider?: string;
  /** Request json field on create runtime invocation request. */
  requestJson?: Record<string, JsonValue>;
  /** Runtime field on create runtime invocation request. */
  runtime: string;
  /** Sandbox policy field on create runtime invocation request. */
  sandboxPolicy?: string;
  /** Status field on create runtime invocation request. */
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  /** Streaming field on create runtime invocation request. */
  streaming?: boolean;
  /** Tool call id field on create runtime invocation request. */
  toolCallId?: string;
  /** Tool name field on create runtime invocation request. */
  toolName?: string;
  /** Trace id field on create runtime invocation request. */
  traceId?: string;
}
