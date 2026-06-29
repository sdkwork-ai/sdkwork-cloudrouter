import type { AnalyticsAdminOverviewRetrieveResult } from './analytics-admin-overview-retrieve-result';

export interface AnalyticsAdminOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
