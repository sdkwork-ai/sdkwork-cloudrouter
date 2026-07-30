/** Runtime invocation item schema exposed by Claw Router. */
export interface RuntimeInvocationItem {
  /** Agent run id field on runtime invocation item. */
  agentRunId: string | null;
  /** Agent run step id field on runtime invocation item. */
  agentRunStepId: string | null;
  /** Agent session id field on runtime invocation item. */
  agentSessionId: string | null;
  /** Approval policy field on runtime invocation item. */
  approvalPolicy: string | null;
  /** Attempt no field on runtime invocation item. */
  attemptNo: string;
  /** Chat item id field on runtime invocation item. */
  chatItemId: string | null;
  /** Chat turn id field on runtime invocation item. */
  chatTurnId: string | null;
  /** Completed at field on runtime invocation item. */
  completedAt: string | null;
  /** Conversation id field on runtime invocation item. */
  conversationId: string | null;
  /** Created at field on runtime invocation item. */
  createdAt: string;
  /** Cwd field on runtime invocation item. */
  cwd: string | null;
  /** Endpoint field on runtime invocation item. */
  endpoint: string | null;
  /** Error code field on runtime invocation item. */
  errorCode: string | null;
  /** Error message masked field on runtime invocation item. */
  errorMessageMasked: string | null;
  /** Error type field on runtime invocation item. */
  errorType: string | null;
  /** Exit code field on runtime invocation item. */
  exitCode: string | null;
  /** Finish reason field on runtime invocation item. */
  finishReason: string | null;
  /** Id field on runtime invocation item. */
  id: string;
  /** Invocation no field on runtime invocation item. */
  invocationNo: string;
  /** Invocation type field on runtime invocation item. */
  invocationType: string;
  /** Latency ms field on runtime invocation item. */
  latencyMs: string | null;
  /** Model field on runtime invocation item. */
  model: string | null;
  /** Permission mode field on runtime invocation item. */
  permissionMode: string | null;
  /** Provider field on runtime invocation item. */
  provider: string | null;
  /** Provider conversation id field on runtime invocation item. */
  providerConversationId: string | null;
  /** Provider response id field on runtime invocation item. */
  providerResponseId: string | null;
  /** Provider session id field on runtime invocation item. */
  providerSessionId: string | null;
  /** Provider step id field on runtime invocation item. */
  providerStepId: string | null;
  /** Runtime field on runtime invocation item. */
  runtime: string;
  /** Sandbox policy field on runtime invocation item. */
  sandboxPolicy: string | null;
  /** Started at field on runtime invocation item. */
  startedAt: string | null;
  /** Status field on runtime invocation item. */
  status: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  /** Streaming field on runtime invocation item. */
  streaming: boolean;
  /** Tool call id field on runtime invocation item. */
  toolCallId: string | null;
  /** Tool name field on runtime invocation item. */
  toolName: string | null;
  /** Trace id field on runtime invocation item. */
  traceId: string | null;
  /** Ttft ms field on runtime invocation item. */
  ttftMs: string | null;
}
