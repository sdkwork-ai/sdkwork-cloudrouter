import type { MembershipsPointsBalanceRetrieveResult } from './memberships-points-balance-retrieve-result';

export interface MembershipsPointsBalanceRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
