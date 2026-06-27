import type { RuntimeInvocationResponse } from './runtime-invocation-response';

/** Invocations create result schema exposed by Claw Router. */
export interface InvocationsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on invocations create result. */
  data?: RuntimeInvocationResponse;
  /** Human-readable response message. */
  msg?: string;
}
