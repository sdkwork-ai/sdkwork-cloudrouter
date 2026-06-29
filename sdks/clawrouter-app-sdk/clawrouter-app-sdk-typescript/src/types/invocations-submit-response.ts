import type { InvocationsSubmitResult } from './invocations-submit-result';

export interface InvocationsSubmitResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
