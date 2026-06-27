import {
  getClawRouterBackendSdkClient,
  isRecord,
  readRequiredApiItems,
  readRequiredNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];

export interface ReferralStat {
  id: string;
  inviter: string;
  total_invited: number;
  total_revenue: string;
  bonus_awarded: string;
  link: string;
}

export class MarketingService {
  static async fetchReferralStats(): Promise<ReferralStat[]> {
    const result = await getClawRouterBackendSdkClient().system.marketing.referralStats.list();
    return readRequiredApiItems(result, 'Failed to fetch referral stats')
      .map(normalizeReferralStat);
  }
}

export async function backendPromotionOffersList(
  params?: Parameters<BackendCommerceService['promotions']['offers']['management']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.offers.management.list(params);
  return readRequiredPromotionItems(result, 'Promotion offer records are required');
}

export async function backendPromotionCouponStocksList(
  params?: Parameters<BackendCommerceService['promotions']['couponStocks']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.couponStocks.list(params);
  return readRequiredPromotionItems(result, 'Promotion coupon stock records are required');
}

export async function backendPromotionCodesList(
  params?: Parameters<BackendCommerceService['promotions']['codes']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.codes.list(params);
  return readRequiredPromotionItems(result, 'Promotion code records are required');
}

export async function backendPromotionDiscountApplicationsList(
  params?: Parameters<BackendCommerceService['promotions']['discountApplications']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.discountApplications.list(params);
  return readRequiredPromotionItems(result, 'Promotion discount application records are required');
}

export async function backendPromotionDiscountAllocationsList(
  params?: Parameters<BackendCommerceService['promotions']['discountAllocations']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.discountAllocations.list(params);
  return readRequiredPromotionItems(result, 'Promotion discount allocation records are required');
}

export async function backendPromotionCodeRedemptionsList(
  params?: Parameters<BackendCommerceService['promotions']['codes']['redemptions']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.codes.redemptions.list(params);
  return readRequiredPromotionItems(result, 'Promotion code redemption records are required');
}

export async function backendPromotionUserCouponsList(
  params?: Parameters<BackendCommerceService['promotions']['userCoupons']['management']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.userCoupons.management.list(params);
  return readRequiredPromotionItems(result, 'Promotion user coupon records are required');
}

export async function backendPromotionCouponLedgerEntriesList(
  params?: Parameters<BackendCommerceService['promotions']['couponLedgerEntries']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.couponLedgerEntries.list(params);
  return readRequiredPromotionItems(result, 'Promotion coupon ledger records are required');
}

export async function backendPromotionBudgetLedgerEntriesList(
  params?: Parameters<BackendCommerceService['promotions']['budgetLedgerEntries']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.budgetLedgerEntries.list(params);
  return readRequiredPromotionItems(result, 'Promotion budget ledger records are required');
}

export async function backendPromotionExternalBindingsList(
  params?: Parameters<BackendCommerceService['promotions']['externalBindings']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.externalBindings.list(params);
  return readRequiredPromotionItems(result, 'Promotion external binding records are required');
}

export async function backendPromotionEventsList(
  params?: Parameters<BackendCommerceService['promotions']['events']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().commerce.promotions.events.list(params);
  return readRequiredPromotionItems(result, 'Promotion event records are required');
}

function normalizeReferralStat(value: unknown): ReferralStat {
  const item = readRequiredRecord(value, 'Referral stat record is required');
  return {
    id: readRequiredString(item, 'id', 'Referral stat id is required'),
    inviter: readRequiredString(item, 'inviter', 'Referral inviter is required'),
    total_invited: readRequiredNumber(item, 'total_invited', 'Referral invited total is required'),
    total_revenue: readRequiredString(item, 'total_revenue', 'Referral revenue is required'),
    bonus_awarded: readRequiredString(item, 'bonus_awarded', 'Referral bonus is required'),
    link: readRequiredString(item, 'link', 'Referral link is required'),
  };
}

function readRequiredPromotionItems(result: unknown, message: string): ApiRecord[] {
  return readRequiredApiItems(result, message)
    .map((value) => {
      const item = readRequiredRecord(value, message);
      readRequiredString(item, 'id', 'Promotion record id is required');
      return item;
    });
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}
