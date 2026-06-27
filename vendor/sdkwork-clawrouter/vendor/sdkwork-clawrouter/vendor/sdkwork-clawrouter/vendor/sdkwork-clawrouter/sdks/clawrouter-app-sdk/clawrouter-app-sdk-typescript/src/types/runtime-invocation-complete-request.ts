import type { JsonValue } from './json-value';
import type { UsageSnapshot } from './usage-snapshot';

/** Runtime invocation complete request schema exposed by Claw Router. */
export interface RuntimeInvocationCompleteRequest {
  /** Error code field on runtime invocation complete request. */
  errorCode?: string;
  /** Error message masked field on runtime invocation complete request. */
  errorMessageMasked?: string;
  /** Error type field on runtime invocation complete request. */
  errorType?: string;
  /** Exit code field on runtime invocation complete request. */
  exitCode?: string;
  /** Finish reason field on runtime invocation complete request. */
  finishReason?: string;
  /** Latency ms field on runtime invocation complete request. */
  latencyMs?: string;
  /** Metadata field on runtime invocation complete request. */
  metadata?: Record<string, JsonValue>;
  /** Provider conversation id field on runtime invocation complete request. */
  providerConversationId?: string;
  /** Provider response id field on runtime invocation complete request. */
  providerResponseId?: string;
  /** Provider session id field on runtime invocation complete request. */
  providerSessionId?: string;
  /** Provider step id field on runtime invocation complete request. */
  providerStepId?: string;
  /** Response json field on runtime invocation complete request. */
  responseJson?: Record<string, JsonValue>;
  /** Status field on runtime invocation complete request. */
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  /** Ttft ms field on runtime invocation complete request. */
  ttftMs?: string;
  /** Usage json field on runtime invocation complete request. */
  usageJson?: UsageSnapshot;
}
