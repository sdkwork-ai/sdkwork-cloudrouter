import type { OrdersCancelResult } from './orders-cancel-result';

export interface OrdersCancelResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
