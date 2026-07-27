/** Recharge package mutation request schema exposed by Claw Router. */
export interface RechargePackageMutationRequest {
  /** Bonus points field on recharge package mutation request. */
  bonusPoints: string;
  /** Currency code field on recharge package mutation request. */
  currencyCode: string;
  /** Price amount field on recharge package mutation request. */
  priceAmount: string;
  /** Status field on recharge package mutation request. */
  status: 'active' | 'inactive';
}
