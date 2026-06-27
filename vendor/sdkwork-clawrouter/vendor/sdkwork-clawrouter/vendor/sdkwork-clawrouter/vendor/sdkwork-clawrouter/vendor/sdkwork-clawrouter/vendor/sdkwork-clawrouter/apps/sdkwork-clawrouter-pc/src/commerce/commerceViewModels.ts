import type {
  SdkworkBillingBreakdownRow as CommerceSdkworkBillingBreakdownRow,
  SdkworkBillingDashboardData as CommerceSdkworkBillingDashboardData,
  SdkworkBillingDigest as CommerceSdkworkBillingDigest,
  SdkworkBillingUsageRecord as CommerceSdkworkBillingUsageRecord,
} from '@sdkwork/commerce-pc-billing';
import type {
  SdkworkMembershipBenefit as CommerceSdkworkMembershipBenefit,
  SdkworkMembershipDashboardData as CommerceSdkworkMembershipDashboardData,
  SdkworkMembershipPlan as CommerceSdkworkMembershipPlan,
  SdkworkMembershipPurchaseResult as CommerceSdkworkMembershipPurchaseResult,
  SdkworkMembershipSummary as CommerceSdkworkMembershipSummary,
} from '@sdkwork/commerce-pc-membership';
import type {
  SdkworkPaymentDetail as CommerceSdkworkPaymentDetail,
  SdkworkPaymentSummary as CommerceSdkworkPaymentSummary,
} from '@sdkwork/commerce-pc-payment';
import type {
  SdkworkWalletOverview as CommerceSdkworkWalletOverview,
  SdkworkWalletRechargeResult as CommerceSdkworkWalletRechargeResult,
  SdkworkWalletWithdrawResult as CommerceSdkworkWalletWithdrawResult,
} from '@sdkwork/commerce-pc-wallet';

export type SdkworkBillingDashboardData = CommerceSdkworkBillingDashboardData;
export type SdkworkBillingBreakdownRow = CommerceSdkworkBillingBreakdownRow;
export type SdkworkBillingDigest = CommerceSdkworkBillingDigest;
export type SdkworkBillingUsageRecord = CommerceSdkworkBillingUsageRecord;

export type SdkworkWalletOverview = CommerceSdkworkWalletOverview;
export type SdkworkWalletRechargeResult = CommerceSdkworkWalletRechargeResult;
export type SdkworkWalletWithdrawResult = CommerceSdkworkWalletWithdrawResult;

export type SdkworkMembershipSummary = CommerceSdkworkMembershipSummary;
export type SdkworkMembershipPlan = CommerceSdkworkMembershipPlan;
export type SdkworkMembershipBenefit = CommerceSdkworkMembershipBenefit;
export type SdkworkMembershipDashboardData = CommerceSdkworkMembershipDashboardData;
export type SdkworkMembershipPurchaseResult = CommerceSdkworkMembershipPurchaseResult;

export type SdkworkPaymentSummary = CommerceSdkworkPaymentSummary;
export type SdkworkPaymentDetail = CommerceSdkworkPaymentDetail;

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
