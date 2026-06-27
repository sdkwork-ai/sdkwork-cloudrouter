import type { AdminServiceNodeItem } from './admin-service-node-item';

/** Admin service nodes response schema exposed by Claw Router. */
export interface AdminServiceNodesResponse {
  /** Items field on admin service nodes response. */
  items: AdminServiceNodeItem[];
}
