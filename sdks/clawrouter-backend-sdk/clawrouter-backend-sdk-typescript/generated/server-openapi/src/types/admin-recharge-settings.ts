/** Admin recharge settings schema exposed by Claw Router. */
export interface AdminRechargeSettings {
  /** Base currency code field on admin recharge settings. */
  baseCurrencyCode: string;
  /** Base points per cny field on admin recharge settings. */
  basePointsPerCny: string;
  /** Currency to cny rates field on admin recharge settings. */
  currencyToCnyRates: Record<string, string>;
}
