/** Recharge settings update request schema exposed by Claw Router. */
export interface RechargeSettingsUpdateRequest {
  /** Base currency code field on recharge settings update request. */
  baseCurrencyCode: string;
  /** Base points per cny field on recharge settings update request. */
  basePointsPerCny: string;
  /** Currency to cny rates field on recharge settings update request. */
  currencyToCnyRates: Record<string, string>;
}
