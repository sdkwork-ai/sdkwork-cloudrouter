import type { OrdersManagementCloseResult } from './orders-management-close-result';

export interface OrdersManagementCloseResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
