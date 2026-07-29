import type { AppRoutingModelStats } from './app-routing-model-stats';
import type { AppRoutingUsageData } from './app-routing-usage-data';

/** App routing usage snapshot schema exposed by Claw Router. */
export interface AppRoutingUsageSnapshot {
  /** Chart data field on app routing usage snapshot. */
  chartData: AppRoutingUsageData[];
  /** Model stats field on app routing usage snapshot. */
  modelStats: AppRoutingModelStats[];
}
