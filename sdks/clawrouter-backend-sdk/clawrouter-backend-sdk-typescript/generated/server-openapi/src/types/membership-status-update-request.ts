/** Membership status update request schema exposed by Claw Router. */
export interface MembershipStatusUpdateRequest {
  /** Status field on membership status update request. */
  status: 'active' | 'inactive' | 'expired' | 'suspended' | 'cancelled';
}
