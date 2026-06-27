/** Admin service node status update request schema exposed by Claw Router. */
export interface AdminServiceNodeStatusUpdateRequest {
  /** Status field on admin service node status update request. */
  status: 'enabled' | 'disabled';
}
