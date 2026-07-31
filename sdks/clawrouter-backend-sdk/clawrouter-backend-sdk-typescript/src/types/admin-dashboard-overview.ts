import type { AdminDashboardPieChartItem } from './admin-dashboard-pie-chart-item';
import type { AdminDashboardRecentUsageItem } from './admin-dashboard-recent-usage-item';
import type { AdminDashboardTrafficItem } from './admin-dashboard-traffic-item';

/** Admin dashboard overview schema exposed by Claw Router. */
export interface AdminDashboardOverview {
  /** Active users field on admin dashboard overview. */
  activeUsers: string;
  /** Model distribution field on admin dashboard overview. */
  modelDistribution: AdminDashboardPieChartItem[];
  /** Multimodal field on admin dashboard overview. */
  multimodal: AdminDashboardPieChartItem[];
  /** Recent usage field on admin dashboard overview. */
  recentUsage: AdminDashboardRecentUsageItem[];
  /** Traffic field on admin dashboard overview. */
  traffic: AdminDashboardTrafficItem[];
  /** User consumption field on admin dashboard overview. */
  userConsumption: AdminDashboardPieChartItem[];
}
