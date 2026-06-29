import type { MembershipsPrivilegesUsageRetrieveResult } from './memberships-privileges-usage-retrieve-result';

export interface MembershipsPrivilegesUsageRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
