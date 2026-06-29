import type { ShopsManagementRetrieveResult } from './shops-management-retrieve-result';

export interface ShopsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
