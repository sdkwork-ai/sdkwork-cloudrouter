import type { RuntimeInvocationListResponse } from './runtime-invocation-list-response';

/** Invocations list result schema exposed by Claw Router. */
export interface InvocationsListResult {
  /** Business response code. */
  code: string;
  /** Data field on invocations list result. */
  data?: RuntimeInvocationListResponse;
  /** Human-readable response message. */
  msg?: string;
}
