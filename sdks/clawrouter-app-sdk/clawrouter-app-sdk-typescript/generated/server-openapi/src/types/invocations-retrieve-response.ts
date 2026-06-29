import type { InvocationsRetrieveResult } from './invocations-retrieve-result';

export interface InvocationsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
