/** Official pricing rate condition schema exposed by Cloud Router. */
export interface OfficialPricingRateCondition {
  /** Dimension code field on official pricing rate condition. */
  dimensionCode: string;
  /** Operator field on official pricing rate condition. */
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists';
  /** Value field on official pricing rate condition. */
  value: string;
}
