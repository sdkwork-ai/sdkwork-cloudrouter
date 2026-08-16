/** Admin pricing plan schema exposed by Cloud Router. */
export interface AdminPricingPlan {
  /** Base price side field on admin pricing plan. */
  basePriceSide: 'official_reference' | 'upstream_cost' | 'customer_charge' | 'internal_transfer';
  /** Created at field on admin pricing plan. */
  createdAt?: string;
  /** Currency code field on admin pricing plan. */
  currencyCode: string;
  /** Effective from field on admin pricing plan. */
  effectiveFrom?: string;
  /** Effective to field on admin pricing plan. */
  effectiveTo?: string;
  /** Fallback policy field on admin pricing plan. */
  fallbackPolicy: string;
  /** Id field on admin pricing plan. */
  id: string;
  /** Minimum charge amount field on admin pricing plan. */
  minimumChargeAmount: string;
  /** Plan code field on admin pricing plan. */
  planCode: string;
  /** Plan name field on admin pricing plan. */
  planName: string;
  /** Rounding mode field on admin pricing plan. */
  roundingMode: 'half_up' | 'half_even' | 'up' | 'down';
  /** Status field on admin pricing plan. */
  status: 'active' | 'inactive';
  /** Updated at field on admin pricing plan. */
  updatedAt?: string;
  /** Version field on admin pricing plan. */
  version?: string;
}
