import type { AdminMonitorAlertsResponse } from './admin-monitor-alerts-response';

/** Monitor alerts list result schema exposed by Claw Router. */
export interface MonitorAlertsListResult {
  /** Business response code. */
  code: string;
  /** Data field on monitor alerts list result. */
  data?: AdminMonitorAlertsResponse;
  /** Human-readable response message. */
  msg?: string;
}
