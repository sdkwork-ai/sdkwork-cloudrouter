import type { RuntimeEventListResponse } from './runtime-event-list-response';

/** Invocation events list result schema exposed by Claw Router. */
export interface InvocationEventsListResult {
  /** Business response code. */
  code: string;
  /** Data field on invocation events list result. */
  data?: RuntimeEventListResponse;
  /** Human-readable response message. */
  msg?: string;
}
