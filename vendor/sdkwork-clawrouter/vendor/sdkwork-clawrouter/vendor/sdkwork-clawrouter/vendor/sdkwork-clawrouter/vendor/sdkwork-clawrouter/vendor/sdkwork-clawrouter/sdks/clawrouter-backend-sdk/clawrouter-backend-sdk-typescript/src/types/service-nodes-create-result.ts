import type { AdminServiceNodeMutationResponse } from './admin-service-node-mutation-response';

/** Service nodes create result schema exposed by Claw Router. */
export interface ServiceNodesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on service nodes create result. */
  data?: AdminServiceNodeMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
