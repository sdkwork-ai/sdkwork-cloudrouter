/** Admin recharge package schema exposed by Claw Router. */
export interface AdminRechargePackage {
  /** Bonus points field on admin recharge package. */
  bonusPoints: string;
  /** Currency code field on admin recharge package. */
  currencyCode: string;
  /** Grant amount field on admin recharge package. */
  grantAmount: string;
  /** Id field on admin recharge package. */
  id: string;
  /** Name field on admin recharge package. */
  name: string;
  /** Package no field on admin recharge package. */
  packageNo: string;
  /** Points field on admin recharge package. */
  points: string;
  /** Price amount field on admin recharge package. */
  priceAmount: string;
  /** Sku id field on admin recharge package. */
  skuId: string;
  /** Status field on admin recharge package. */
  status: 'active' | 'inactive';
  /** Updated at field on admin recharge package. */
  updatedAt: string;
}
