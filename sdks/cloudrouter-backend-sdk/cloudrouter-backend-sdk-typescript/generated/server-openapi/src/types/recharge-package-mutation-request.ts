/** Recharge package mutation request schema exposed by Cloud Router. */
export interface RechargePackageMutationRequest {
  /** Bonus points field on recharge package mutation request. */
  bonusPoints: string;
  /** Currency code field on recharge package mutation request. */
  currencyCode: string;
  /** Discount rate percentage: 100 means no discount, 90 means pay 90 percent of the price. */
  discount: number;
  /** Price amount field on recharge package mutation request. */
  priceAmount: string;
  /** Status field on recharge package mutation request. */
  status: 'active' | 'inactive';
}
