import type { AdminServiceNodesResponse } from './admin-service-nodes-response';

/** Service nodes list result schema exposed by Claw Router. */
export interface ServiceNodesListResult {
  /** Business response code. */
  code: string;
  /** Data field on service nodes list result. */
  data?: AdminServiceNodesResponse;
  /** Human-readable response message. */
  msg?: string;
}
