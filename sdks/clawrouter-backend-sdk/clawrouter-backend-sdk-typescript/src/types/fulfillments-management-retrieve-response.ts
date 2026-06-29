import type { FulfillmentsManagementRetrieveResult } from './fulfillments-management-retrieve-result';

export interface FulfillmentsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
