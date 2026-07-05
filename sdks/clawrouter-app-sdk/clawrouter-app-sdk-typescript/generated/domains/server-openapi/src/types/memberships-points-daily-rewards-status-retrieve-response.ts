import type { MembershipsPointsDailyRewardsStatusRetrieveResult } from './memberships-points-daily-rewards-status-retrieve-result';

export interface MembershipsPointsDailyRewardsStatusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
