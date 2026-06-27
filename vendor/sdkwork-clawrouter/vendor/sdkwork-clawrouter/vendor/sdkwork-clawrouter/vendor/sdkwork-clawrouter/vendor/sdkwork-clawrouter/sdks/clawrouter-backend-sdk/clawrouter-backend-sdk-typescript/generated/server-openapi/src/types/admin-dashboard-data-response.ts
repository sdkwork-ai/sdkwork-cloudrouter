import type { AdminDashboardRecentUsageItem } from './admin-dashboard-recent-usage-item';
import type { AdminDashboardTrafficItem } from './admin-dashboard-traffic-item';
import type { AdminPieChartItem } from './admin-pie-chart-item';

/** Admin dashboard data response schema exposed by Claw Router. */
export interface AdminDashboardDataResponse {
  /** Active users field on admin dashboard data response. */
  activeUsers: string;
  /** Model distribution field on admin dashboard data response. */
  modelDistribution: AdminPieChartItem[];
  /** Multimodal field on admin dashboard data response. */
  multimodal: AdminPieChartItem[];
  /** Recent usage field on admin dashboard data response. */
  recentUsage: AdminDashboardRecentUsageItem[];
  /** Traffic field on admin dashboard data response. */
  traffic: AdminDashboardTrafficItem[];
  /** User consumption field on admin dashboard data response. */
  userConsumption: AdminPieChartItem[];
}
