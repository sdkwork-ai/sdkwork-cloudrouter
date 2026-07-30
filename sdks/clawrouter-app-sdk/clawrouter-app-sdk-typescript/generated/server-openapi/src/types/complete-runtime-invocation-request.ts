import type { JsonValue } from './json-value';

/** Complete runtime invocation request schema exposed by Claw Router. */
export interface CompleteRuntimeInvocationRequest {
  /** Error code field on complete runtime invocation request. */
  errorCode?: string;
  /** Error message masked field on complete runtime invocation request. */
  errorMessageMasked?: string;
  /** Error type field on complete runtime invocation request. */
  errorType?: string;
  /** Exit code field on complete runtime invocation request. */
  exitCode?: string;
  /** Finish reason field on complete runtime invocation request. */
  finishReason?: string;
  /** Latency ms field on complete runtime invocation request. */
  latencyMs?: string;
  /** Metadata field on complete runtime invocation request. */
  metadata?: Record<string, JsonValue>;
  /** Provider conversation id field on complete runtime invocation request. */
  providerConversationId?: string;
  /** Provider response id field on complete runtime invocation request. */
  providerResponseId?: string;
  /** Provider session id field on complete runtime invocation request. */
  providerSessionId?: string;
  /** Provider step id field on complete runtime invocation request. */
  providerStepId?: string;
  /** Response json field on complete runtime invocation request. */
  responseJson?: Record<string, JsonValue>;
  /** Status field on complete runtime invocation request. */
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  /** Ttft ms field on complete runtime invocation request. */
  ttftMs?: string;
  /** Usage json field on complete runtime invocation request. */
  usageJson?: Record<string, JsonValue>;
}
