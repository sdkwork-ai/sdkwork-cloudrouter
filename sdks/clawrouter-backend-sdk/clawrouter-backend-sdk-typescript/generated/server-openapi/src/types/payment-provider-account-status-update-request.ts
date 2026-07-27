/** Payment provider account status update request schema exposed by Claw Router. */
export interface PaymentProviderAccountStatusUpdateRequest {
  /** Client request no field on payment provider account status update request. */
  clientRequestNo?: string;
  /** Note field on payment provider account status update request. */
  note?: string;
  /** Status field on payment provider account status update request. */
  status: 'active' | 'inactive' | 'disabled';
}
