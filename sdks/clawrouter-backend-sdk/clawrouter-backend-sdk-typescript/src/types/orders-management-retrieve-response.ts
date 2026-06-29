import type { OrdersManagementRetrieveResult } from './orders-management-retrieve-result';

export interface OrdersManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
