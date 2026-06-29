import type { ReportsCommerceOverviewRetrieveResult } from './reports-commerce-overview-retrieve-result';

export interface ReportsCommerceOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
