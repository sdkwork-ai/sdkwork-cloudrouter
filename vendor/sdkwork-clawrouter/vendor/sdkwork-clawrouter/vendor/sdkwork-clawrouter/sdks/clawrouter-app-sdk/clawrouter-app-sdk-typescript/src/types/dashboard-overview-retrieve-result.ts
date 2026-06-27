import type { DashboardOverviewResponse } from './dashboard-overview-response';

/** Dashboard overview retrieve result schema exposed by Claw Router. */
export interface DashboardOverviewRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on dashboard overview retrieve result. */
  data?: DashboardOverviewResponse;
  /** Human-readable response message. */
  msg?: string;
}
