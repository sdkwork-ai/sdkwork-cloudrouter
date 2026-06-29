import type { SuppressionsCreateResult } from './suppressions-create-result';

export interface SuppressionsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
