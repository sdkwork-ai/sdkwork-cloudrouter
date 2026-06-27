import type { AdminDashboardDataResponse } from './admin-dashboard-data-response';

/** Dashboard admin overview retrieve result schema exposed by Claw Router. */
export interface DashboardAdminOverviewRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on dashboard admin overview retrieve result. */
  data?: AdminDashboardDataResponse;
  /** Human-readable response message. */
  msg?: string;
}
