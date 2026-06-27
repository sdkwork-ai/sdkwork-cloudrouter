import type { RuntimeInvocationItem } from './runtime-invocation-item';

/** Invocations retrieve result schema exposed by Claw Router. */
export interface InvocationsRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on invocations retrieve result. */
  data?: RuntimeInvocationItem;
  /** Human-readable response message. */
  msg?: string;
}
