/** Membership package group mutation request schema exposed by Claw Router. */
export interface MembershipPackageGroupMutationRequest {
  /** Billing cycle field on membership package group mutation request. */
  billingCycle: string;
  /** Code field on membership package group mutation request. */
  code: string;
  /** Description field on membership package group mutation request. */
  description?: string;
  /** Duration days field on membership package group mutation request. */
  durationDays: string;
  /** Name field on membership package group mutation request. */
  name: string;
  /** Sort weight field on membership package group mutation request. */
  sortWeight?: string;
  /** Status field on membership package group mutation request. */
  status: 'active' | 'inactive' | 'disabled';
}
