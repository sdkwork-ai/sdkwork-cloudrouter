import type { RefundsCreateResult } from './refunds-create-result';

export interface RefundsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
