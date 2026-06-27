import type { AdminMonitorNodeItem } from './admin-monitor-node-item';

/** Admin monitor nodes response schema exposed by Claw Router. */
export interface AdminMonitorNodesResponse {
  /** Items field on admin monitor nodes response. */
  items: AdminMonitorNodeItem[];
}
