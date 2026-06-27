import type { AdminMonitorNodesResponse } from './admin-monitor-nodes-response';

/** Monitor nodes list result schema exposed by Claw Router. */
export interface MonitorNodesListResult {
  /** Business response code. */
  code: string;
  /** Data field on monitor nodes list result. */
  data?: AdminMonitorNodesResponse;
  /** Human-readable response message. */
  msg?: string;
}
