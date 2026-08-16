/** Official pricing rate tier schema exposed by Cloud Router. */
export interface OfficialPricingRateTier {
  /** Currency code field on official pricing rate tier. */
  currencyCode: string;
  /** Flat amount field on official pricing rate tier. */
  flatAmount: string;
  /** Lower bound field on official pricing rate tier. */
  lowerBound: string;
  /** Tier code field on official pricing rate tier. */
  tierCode: string;
  /** Unit price field on official pricing rate tier. */
  unitPrice: string;
  /** Unit size field on official pricing rate tier. */
  unitSize: string;
  /** Upper bound field on official pricing rate tier. */
  upperBound?: string | null;
}
