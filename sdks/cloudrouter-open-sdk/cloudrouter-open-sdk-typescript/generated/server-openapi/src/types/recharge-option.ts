/** Recharge option schema exposed by Cloud Router. */
export interface RechargeOption {
  /** Extra points granted on top of `points`. */
  bonusPoints: number;
  /** ISO-4217 currency code of `priceAmount`. */
  currencyCode: string;
  /** Total points granted once paid. */
  grantAmount: number;
  /** Display label for the package. */
  label: string;
  /** Relay-owned package identifier. */
  packageId: string;
  /** Base points granted by the package. */
  points: number;
  /** Price in major units as a decimal string. */
  priceAmount: string;
  /** Whether the relay recommends this package. */
  recommended: boolean;
}
