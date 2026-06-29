import type { MembershipsCurrentRetrieveResult } from './memberships-current-retrieve-result';

export interface MembershipsCurrentRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
