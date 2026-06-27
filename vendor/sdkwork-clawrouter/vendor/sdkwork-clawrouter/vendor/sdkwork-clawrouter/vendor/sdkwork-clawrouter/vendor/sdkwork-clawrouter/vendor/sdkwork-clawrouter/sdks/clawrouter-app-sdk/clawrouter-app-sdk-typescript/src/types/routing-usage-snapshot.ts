import type { RoutingModelStats } from './routing-model-stats';
import type { RoutingUsageData } from './routing-usage-data';

/** Routing usage snapshot schema exposed by Claw Router. */
export interface RoutingUsageSnapshot {
  /** Chart data field on routing usage snapshot. */
  chartData: RoutingUsageData[];
  /** Model stats field on routing usage snapshot. */
  modelStats: RoutingModelStats[];
}
