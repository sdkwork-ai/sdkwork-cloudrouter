import type { DashboardAdminOverviewRetrieveResult } from './dashboard-admin-overview-retrieve-result';

export interface DashboardAdminOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
