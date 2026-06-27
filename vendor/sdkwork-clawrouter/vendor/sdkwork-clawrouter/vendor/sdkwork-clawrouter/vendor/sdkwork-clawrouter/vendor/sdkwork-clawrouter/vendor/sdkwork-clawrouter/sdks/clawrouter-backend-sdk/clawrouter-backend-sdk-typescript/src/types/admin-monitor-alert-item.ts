/** Admin monitor alert item schema exposed by Claw Router. */
export interface AdminMonitorAlertItem {
  /** Id field on admin monitor alert item. */
  id: string;
  /** Message field on admin monitor alert item. */
  message: string;
  /** Severity field on admin monitor alert item. */
  severity: 'critical' | 'warning' | 'info';
  /** Source field on admin monitor alert item. */
  source: string;
  /** Status field on admin monitor alert item. */
  status: 'active' | 'resolved';
  /** Time field on admin monitor alert item. */
  time: string;
  /** Title field on admin monitor alert item. */
  title: string;
}
