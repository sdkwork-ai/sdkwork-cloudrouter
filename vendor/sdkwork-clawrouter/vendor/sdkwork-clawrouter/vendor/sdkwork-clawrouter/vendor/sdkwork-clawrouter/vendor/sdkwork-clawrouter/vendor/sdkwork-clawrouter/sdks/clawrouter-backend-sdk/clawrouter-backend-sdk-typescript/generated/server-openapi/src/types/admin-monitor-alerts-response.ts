import type { AdminMonitorAlertItem } from './admin-monitor-alert-item';

/** Admin monitor alerts response schema exposed by Claw Router. */
export interface AdminMonitorAlertsResponse {
  /** Items field on admin monitor alerts response. */
  items: AdminMonitorAlertItem[];
}
