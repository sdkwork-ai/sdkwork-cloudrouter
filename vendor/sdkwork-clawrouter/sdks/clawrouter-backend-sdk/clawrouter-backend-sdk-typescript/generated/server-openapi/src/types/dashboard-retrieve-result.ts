import type { ServiceProviderDashboardResponse } from './service-provider-dashboard-response';

/** Dashboard retrieve result schema exposed by Claw Router. */
export interface DashboardRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on dashboard retrieve result. */
  data?: ServiceProviderDashboardResponse;
  /** Human-readable response message. */
  msg?: string;
}
