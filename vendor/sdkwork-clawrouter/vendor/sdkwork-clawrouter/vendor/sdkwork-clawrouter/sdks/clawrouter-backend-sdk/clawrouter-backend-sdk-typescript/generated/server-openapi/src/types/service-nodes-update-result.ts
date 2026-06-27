import type { AdminServiceNodeMutationResponse } from './admin-service-node-mutation-response';

/** Service nodes update result schema exposed by Claw Router. */
export interface ServiceNodesUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on service nodes update result. */
  data?: AdminServiceNodeMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
