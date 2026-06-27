import type { AdminMonitorPerformanceResponse } from './admin-monitor-performance-response';

/** Monitor performance list result schema exposed by Claw Router. */
export interface MonitorPerformanceListResult {
  /** Business response code. */
  code: string;
  /** Data field on monitor performance list result. */
  data?: AdminMonitorPerformanceResponse;
  /** Human-readable response message. */
  msg?: string;
}
