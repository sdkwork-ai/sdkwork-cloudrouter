import type { RechargeOption } from './recharge-option';

/** Recharge options schema exposed by Cloud Router. */
export interface RechargeOptions {
  /** Agreement copy the caller must accept before paying. */
  agreement: string;
  /** Currency shared by `items`. */
  currencyCode: string;
  /** Whether the relay accepts an arbitrary amount. */
  customAmountSupported: boolean;
  /** Fixed recharge packages in relay display order. */
  items: RechargeOption[];
  /** Highest accepted custom amount in major units. */
  maxAmount?: string | null;
  /** Lowest accepted custom amount in major units. */
  minAmount?: string | null;
  /** Points asset label used by the relay. */
  pointsUnit: string;
}
