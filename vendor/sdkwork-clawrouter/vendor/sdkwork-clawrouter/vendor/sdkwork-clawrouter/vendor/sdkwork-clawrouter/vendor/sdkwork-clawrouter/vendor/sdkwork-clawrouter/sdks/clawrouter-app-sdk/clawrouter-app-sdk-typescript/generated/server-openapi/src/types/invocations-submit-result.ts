import type { RuntimeInvocationResponse } from './runtime-invocation-response';

/** Invocations submit result schema exposed by Claw Router. */
export interface InvocationsSubmitResult {
  /** Business response code. */
  code: string;
  /** Data field on invocations submit result. */
  data?: RuntimeInvocationResponse;
  /** Human-readable response message. */
  msg?: string;
}
