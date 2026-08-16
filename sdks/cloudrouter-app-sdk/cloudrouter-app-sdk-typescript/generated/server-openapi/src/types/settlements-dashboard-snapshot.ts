import type { SettlementBill } from './settlement-bill';
import type { SettlementChartPoint } from './settlement-chart-point';

/** Settlements dashboard snapshot schema exposed by Cloud Router. */
export interface SettlementsDashboardSnapshot {
  /** Bills field on settlements dashboard snapshot. */
  bills: SettlementBill[];
  /** Chart data field on settlements dashboard snapshot. */
  chartData: SettlementChartPoint[];
}
