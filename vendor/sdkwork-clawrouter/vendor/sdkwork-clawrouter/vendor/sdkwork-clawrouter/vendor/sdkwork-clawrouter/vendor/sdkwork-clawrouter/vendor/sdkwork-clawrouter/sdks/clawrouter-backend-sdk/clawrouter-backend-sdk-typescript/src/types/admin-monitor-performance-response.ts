import type { AdminMonitorPerformanceItem } from './admin-monitor-performance-item';

/** Admin monitor performance response schema exposed by Claw Router. */
export interface AdminMonitorPerformanceResponse {
  /** Items field on admin monitor performance response. */
  items: AdminMonitorPerformanceItem[];
}
