export interface RechargeOrderCreateCommand {
  amount?: string | number;
  clientRequestNo?: string;
  couponCode?: string;
  currencyCode?: string;
  grantAmount?: string | number;
  packageId?: string;
  paymentMethod?: string;
  paymentPassword?: string;
  planCode?: string;
  planPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'continuous_monthly' | 'continuous_yearly';
  source?: string;
  subject?: 'points_recharge' | 'token_bank_recharge' | 'token_bank_plan_purchase' | 'token_bank_plan_renewal' | 'account_recharge_package' | 'coupon_recharge';
  targetAsset?: 'points' | 'token_bank' | 'cash';
}
