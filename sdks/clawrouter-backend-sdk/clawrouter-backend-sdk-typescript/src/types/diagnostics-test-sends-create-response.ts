import type { DiagnosticsTestSendsCreateResult } from './diagnostics-test-sends-create-result';

export interface DiagnosticsTestSendsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
