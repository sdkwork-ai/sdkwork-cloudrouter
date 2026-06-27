import type { AdminServiceNodeDeleteResponse } from './admin-service-node-delete-response';

/** Service nodes delete result schema exposed by Claw Router. */
export interface ServiceNodesDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on service nodes delete result. */
  data?: AdminServiceNodeDeleteResponse;
  /** Human-readable response message. */
  msg?: string;
}
