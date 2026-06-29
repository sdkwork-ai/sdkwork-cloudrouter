import type { MembershipsCurrentStatusRetrieveResult } from './memberships-current-status-retrieve-result';

export interface MembershipsCurrentStatusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
