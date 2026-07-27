/** Membership package mutation request schema exposed by Claw Router. */
export interface MembershipPackageMutationRequest {
  /** Code field on membership package mutation request. */
  code: string;
  /** Currency code field on membership package mutation request. */
  currencyCode: string;
  /** Duration days field on membership package mutation request. */
  durationDays: string;
  /** Name field on membership package mutation request. */
  name: string;
  /** Package group id field on membership package mutation request. */
  packageGroupId: string;
  /** Plan id field on membership package mutation request. */
  planId: string;
  /** Price amount field on membership package mutation request. */
  priceAmount: string;
  /** Status field on membership package mutation request. */
  status: 'active' | 'inactive' | 'disabled';
}
