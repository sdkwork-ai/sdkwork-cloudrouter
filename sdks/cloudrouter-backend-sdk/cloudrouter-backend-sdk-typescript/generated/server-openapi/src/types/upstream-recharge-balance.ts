/** Live balance of the relay account that owns the recharge API key. */
export interface UpstreamRechargeBalance {
  /** Amount field on upstream recharge balance. */
  amount: string;
  /** Checked at field on upstream recharge balance. */
  checkedAt: string;
  /** Currency code field on upstream recharge balance. */
  currencyCode: string | null;
  /** Frozen field on upstream recharge balance. */
  frozen: string;
  /** Unit field on upstream recharge balance. */
  unit: string;
}
