import type { RuntimeEventListResponse } from './runtime-event-list-response';

/** Invocation event streams list result schema exposed by Claw Router. */
export interface InvocationEventStreamsListResult {
  /** Business response code. */
  code: string;
  /** Data field on invocation event streams list result. */
  data?: RuntimeEventListResponse;
  /** Human-readable response message. */
  msg?: string;
}
