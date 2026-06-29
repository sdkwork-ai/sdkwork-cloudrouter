import type { OrdersManagementCancelResult } from './orders-management-cancel-result';

export interface OrdersManagementCancelResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
