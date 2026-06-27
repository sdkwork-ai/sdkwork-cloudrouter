import type { RuntimeEventResponse } from './runtime-event-response';

/** Invocation events create result schema exposed by Claw Router. */
export interface InvocationEventsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on invocation events create result. */
  data?: RuntimeEventResponse;
  /** Human-readable response message. */
  msg?: string;
}
