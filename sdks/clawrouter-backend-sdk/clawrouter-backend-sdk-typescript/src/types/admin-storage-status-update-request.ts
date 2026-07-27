/** Admin storage status update request schema exposed by Claw Router. */
export interface AdminStorageStatusUpdateRequest {
  /** Reason field on admin storage status update request. */
  reason: string;
  /** Status field on admin storage status update request. */
  status: 'active' | 'archived' | 'disabled';
}
