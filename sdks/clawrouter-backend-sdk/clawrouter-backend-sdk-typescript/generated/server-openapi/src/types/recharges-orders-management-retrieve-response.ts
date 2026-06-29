import type { RechargesOrdersManagementRetrieveResult } from './recharges-orders-management-retrieve-result';

export interface RechargesOrdersManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
