/** Official pricing rate condition schema exposed by Cloud Router. */
export interface OfficialPricingRateCondition {
  /** Dimension code field on official pricing rate condition. */
  dimensionCode: string;
  /** Operator code field on official pricing rate condition. */
  operatorCode: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists';
  /** Value field on official pricing rate condition. */
  value: string | number | boolean | (string | number | boolean)[];
}
