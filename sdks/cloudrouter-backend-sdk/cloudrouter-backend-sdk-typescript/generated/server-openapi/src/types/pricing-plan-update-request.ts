/** Pricing plan update request schema exposed by Cloud Router. */
export interface PricingPlanUpdateRequest {
  /** Base price side field on pricing plan update request. */
  basePriceSide: 'official_reference' | 'upstream_cost' | 'customer_charge' | 'internal_transfer';
  /** Currency code field on pricing plan update request. */
  currencyCode: string;
  /** Effective from field on pricing plan update request. */
  effectiveFrom?: string;
  /** Effective to field on pricing plan update request. */
  effectiveTo?: string;
  /** Minimum charge amount field on pricing plan update request. */
  minimumChargeAmount: string;
  /** Plan code field on pricing plan update request. */
  planCode?: string;
  /** Plan name field on pricing plan update request. */
  planName: string;
  /** Rounding mode field on pricing plan update request. */
  roundingMode: 'half_up' | 'half_even' | 'up' | 'down';
  /** Status field on pricing plan update request. */
  status: 'active' | 'inactive';
}
