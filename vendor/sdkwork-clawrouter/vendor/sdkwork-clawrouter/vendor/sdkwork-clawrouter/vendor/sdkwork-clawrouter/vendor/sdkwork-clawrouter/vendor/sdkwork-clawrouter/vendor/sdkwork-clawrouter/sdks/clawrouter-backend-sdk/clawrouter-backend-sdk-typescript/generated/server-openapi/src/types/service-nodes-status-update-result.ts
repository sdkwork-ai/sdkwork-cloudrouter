import type { AdminServiceNodeMutationResponse } from './admin-service-node-mutation-response';

/** Service nodes status update result schema exposed by Claw Router. */
export interface ServiceNodesStatusUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on service nodes status update result. */
  data?: AdminServiceNodeMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
