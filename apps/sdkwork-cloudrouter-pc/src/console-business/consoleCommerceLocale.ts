import { normalizeSdkworkWalletLocale } from '@sdkwork/account-pc-wallet';
import { normalizeSdkworkMembershipLocale } from '@sdkwork/membership-pc-membership';
import { normalizeSdkworkSubscriptionLocale } from '@sdkwork/membership-pc-subscription';
import { normalizeSdkworkOrderLocale } from '@sdkwork/order-pc-order';
import { normalizeSdkworkCouponLocale } from '@sdkwork/promotion-pc-coupon';

export function resolveConsoleCommerceLocale(language: string | undefined): string {
  return language ?? 'en';
}

export function resolveConsoleWalletLocale(language: string | undefined): string {
  return normalizeSdkworkWalletLocale(language);
}

export function resolveConsoleMembershipLocale(language: string | undefined): string {
  return normalizeSdkworkMembershipLocale(language);
}

export function resolveConsoleSubscriptionLocale(language: string | undefined): string {
  return normalizeSdkworkSubscriptionLocale(language);
}

export function resolveConsoleOrderLocale(language: string | undefined): string {
  return normalizeSdkworkOrderLocale(language);
}

export function resolveConsoleCouponLocale(language: string | undefined): string {
  return normalizeSdkworkCouponLocale(language);
}
