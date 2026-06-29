import type { DashboardOverviewRetrieveResult } from './dashboard-overview-retrieve-result';

export interface DashboardOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
