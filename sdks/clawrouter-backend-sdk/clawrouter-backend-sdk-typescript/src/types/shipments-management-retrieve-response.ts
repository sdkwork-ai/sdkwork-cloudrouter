import type { ShipmentsManagementRetrieveResult } from './shipments-management-retrieve-result';

export interface ShipmentsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
