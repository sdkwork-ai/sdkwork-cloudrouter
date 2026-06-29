import type { ShopsCurrentDashboardRetrieveResult } from './shops-current-dashboard-retrieve-result';

export interface ShopsCurrentDashboardRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
