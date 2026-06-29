import type { InvocationEventsCreateResult } from './invocation-events-create-result';

export interface InvocationEventsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
