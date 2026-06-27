import type { DashboardAnnouncement } from './dashboard-announcement';
import type { DashboardChartPoint } from './dashboard-chart-point';
import type { DashboardConfigurationDomain } from './dashboard-configuration-domain';
import type { DashboardOverviewSummary } from './dashboard-overview-summary';
import type { DashboardSparklinePoint } from './dashboard-sparkline-point';
import type { DashboardTopModel } from './dashboard-top-model';

/** Dashboard overview response schema exposed by Claw Router. */
export interface DashboardOverviewResponse {
  /** Announcements field on dashboard overview response. */
  announcements: DashboardAnnouncement[];
  /** Chart data field on dashboard overview response. */
  chartData: DashboardChartPoint[];
  /** Configuration domains field on dashboard overview response. */
  configurationDomains?: DashboardConfigurationDomain[];
  /** Multimodal sparkline field on dashboard overview response. */
  multimodalSparkline: DashboardSparklinePoint[];
  /** Performance sparkline field on dashboard overview response. */
  performanceSparkline: DashboardSparklinePoint[];
  /** Request sparkline field on dashboard overview response. */
  requestSparkline: DashboardSparklinePoint[];
  /** Summary field on dashboard overview response. */
  summary: DashboardOverviewSummary;
  /** Top models field on dashboard overview response. */
  topModels: DashboardTopModel[];
  /** Warnings field on dashboard overview response. */
  warnings: string[];
}
