/** Upstream recharge option schema exposed by Cloud Router. */
export interface UpstreamRechargeOption {
  /** Bonus points field on upstream recharge option. */
  bonusPoints: number;
  /** Currency code field on upstream recharge option. */
  currencyCode: string;
  /** Grant amount field on upstream recharge option. */
  grantAmount: number;
  /** Label field on upstream recharge option. */
  label: string;
  /** Package id field on upstream recharge option. */
  packageId: string;
  /** Points field on upstream recharge option. */
  points: number;
  /** Price amount field on upstream recharge option. */
  priceAmount: string;
  /** Recommended field on upstream recharge option. */
  recommended: boolean;
}
