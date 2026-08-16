/** Pricing plan create request schema exposed by Cloud Router. */
export interface PricingPlanCreateRequest {
  /** Base price side field on pricing plan create request. */
  basePriceSide: 'official_reference' | 'upstream_cost' | 'customer_charge' | 'internal_transfer';
  /** Currency code field on pricing plan create request. */
  currencyCode: string;
  /** Effective from field on pricing plan create request. */
  effectiveFrom?: string;
  /** Effective to field on pricing plan create request. */
  effectiveTo?: string;
  /** Minimum charge amount field on pricing plan create request. */
  minimumChargeAmount: string;
  /** Plan code field on pricing plan create request. */
  planCode: string;
  /** Plan name field on pricing plan create request. */
  planName: string;
  /** Rounding mode field on pricing plan create request. */
  roundingMode: 'half_up' | 'half_even' | 'up' | 'down';
  /** Status field on pricing plan create request. */
  status: 'active' | 'inactive';
}
