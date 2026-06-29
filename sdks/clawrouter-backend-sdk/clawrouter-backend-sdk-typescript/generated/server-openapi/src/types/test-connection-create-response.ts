import type { TestConnectionCreateResult } from './test-connection-create-result';

export interface TestConnectionCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
