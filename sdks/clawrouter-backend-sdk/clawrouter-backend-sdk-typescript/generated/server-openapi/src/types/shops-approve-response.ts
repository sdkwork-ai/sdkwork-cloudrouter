import type { ShopsApproveResult } from './shops-approve-result';

export interface ShopsApproveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
