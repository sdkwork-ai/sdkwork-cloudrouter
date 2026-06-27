import type {
  SdkworkMembershipBenefit as DomainSdkworkMembershipBenefit,
  SdkworkMembershipDashboardData as DomainSdkworkMembershipDashboardData,
  SdkworkMembershipPlan as DomainSdkworkMembershipPlan,
  SdkworkMembershipPurchaseResult as DomainSdkworkMembershipPurchaseResult,
  SdkworkMembershipSummary as DomainSdkworkMembershipSummary,
} from '@sdkwork/membership-pc-membership';
import type {
  SdkworkPaymentDetail as DomainSdkworkPaymentDetail,
  SdkworkPaymentSummary as DomainSdkworkPaymentSummary,
} from '@sdkwork/payment-pc-payment';
import type {
  SdkworkWalletOverview as DomainSdkworkWalletOverview,
  SdkworkWalletRechargeResult as DomainSdkworkWalletRechargeResult,
  SdkworkWalletWithdrawResult as DomainSdkworkWalletWithdrawResult,
} from '@sdkwork/account-pc-wallet';

export type SdkworkWalletOverview = DomainSdkworkWalletOverview;
export type SdkworkWalletRechargeResult = DomainSdkworkWalletRechargeResult;
export type SdkworkWalletWithdrawResult = DomainSdkworkWalletWithdrawResult;

export type SdkworkMembershipSummary = DomainSdkworkMembershipSummary;
export type SdkworkMembershipPlan = DomainSdkworkMembershipPlan;
export type SdkworkMembershipBenefit = DomainSdkworkMembershipBenefit;
export type SdkworkMembershipDashboardData = DomainSdkworkMembershipDashboardData;
export type SdkworkMembershipPurchaseResult = DomainSdkworkMembershipPurchaseResult;

export type SdkworkPaymentSummary = DomainSdkworkPaymentSummary;
export type SdkworkPaymentDetail = DomainSdkworkPaymentDetail;

export interface RechargeSettingsSnapshot {
  baseCurrencyCode: string;
  basePointsPerCny: string;
  currencyToCnyRates: Record<string, string>;
  previewExamples?: Record<string, Record<string, { grantAmount: number }>>;
}

/** Legacy recharge package contract shape retained for schema registry parity. */
export interface RechargePackage {
  id: string;
  priceAmount: string;
  currencyCode: string;
  bonusPoints: number;
  grantAmount: number;
  points: number;
}

/** Legacy recharge checkout result contract shape retained for schema registry parity. */
export interface RechargeOrderCreateResult {
  success: boolean;
  orderNo: string;
  providerCode: string;
  paymentMethod: string;
  paymentProduct: string;
  nextAction: string;
  cashierUrl: string | null;
  qrCodePayload: string | null;
  requestPaymentPayload: Record<string, unknown> | null;
}

/** Legacy billing history row contract shape retained for schema registry parity. */
export interface BillingHistoryItem {
  id: string;
  historyNo: string;
  type: string;
  direction: string;
  assetType: string;
  amount: string;
  currencyCode: string;
  pointsDelta: number | null;
  status: string;
  title: string;
  referenceNo: string | null;
  sourceType: string | null;
  sourceId: string | null;
  relatedOrderNo: string | null;
  paymentMethod: string | null;
  occurredAt: string;
  method: string;
}

/** Legacy checkout status contract shape retained for schema registry parity. */
export interface CheckoutStatus {
  orderNo: string;
  outTradeNo: string | null;
  amount: string;
  points: number | null;
  providerCode: string | null;
  paymentMethod: string | null;
  paymentProduct: string | null;
  orderStatus: string;
  paymentStatus: string;
  rechargeStatus: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  nextAction: string | null;
  cashierUrl: string | null;
  qrCodePayload: string | null;
  requestPaymentPayload: Record<string, unknown> | null;
}
