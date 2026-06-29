import type { InvocationsCreateResult } from './invocations-create-result';

export interface InvocationsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
