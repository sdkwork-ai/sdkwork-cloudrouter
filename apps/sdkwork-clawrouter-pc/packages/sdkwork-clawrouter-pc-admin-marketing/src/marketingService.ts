import {
  getClawRouterBackendSdkClient,
  getSdkworkPromotionBackendSdkClient,
  isRecord,
  readApiData,
  readRequiredApiItems,
  readRequiredNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendPromotionsService = ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions'];
type ClawBackendPromotionsService = ReturnType<typeof getClawRouterBackendSdkClient>['promotions'];
type ClawBackendMarketingService = ReturnType<typeof getClawRouterBackendSdkClient>['system']['marketing'];
type PromotionPage = ApiRecord & { items: ApiRecord[]; pageInfo: ApiRecord };

export interface ReferralStat {
  id: string;
  inviter: string;
  total_invited: number;
  total_revenue: string;
  bonus_awarded: string;
  link: string;
}

export class MarketingService {
  static async fetchReferralStats(
    params?: Parameters<ClawBackendMarketingService['referralStats']['list']>[0],
  ): Promise<ApiRecord & { items: ReferralStat[]; pageInfo: ApiRecord }> {
    const result = await getClawRouterBackendSdkClient().system.marketing.referralStats.list(params);
    const page = readRequiredPromotionPage(result, 'Failed to fetch referral stats');
    return {
      ...page,
      items: page.items.map(normalizeReferralStat),
    };
  }
}

export async function backendPromotionOffersList(
  params?: Parameters<BackendPromotionsService['offers']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.list(params);
  return readRequiredPromotionPage(result, 'Promotion offer records are required');
}

export async function backendPromotionCouponStocksList(
  params?: Parameters<BackendPromotionsService['couponStocks']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponStocks.list(params);
  return readRequiredPromotionPage(result, 'Promotion coupon stock records are required');
}

export async function backendPromotionCodesList(
  params?: Parameters<BackendPromotionsService['codes']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.list(params);
  return readRequiredPromotionPage(result, 'Promotion code records are required');
}

export async function backendPromotionDiscountApplicationsList(
  params?: Parameters<BackendPromotionsService['discountApplications']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.discountApplications.list(params);
  return readRequiredPromotionPage(result, 'Promotion discount application records are required');
}

export async function backendPromotionDiscountAllocationsList(
  params?: Parameters<ClawBackendPromotionsService['discountAllocations']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().promotions.discountAllocations.list(params);
  return readRequiredPromotionPage(result, 'Promotion discount allocation records are required');
}

export async function backendPromotionCodeRedemptionsList(
  params?: Parameters<ClawBackendPromotionsService['codes']['redemptions']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().promotions.codes.redemptions.list(params);
  return readRequiredPromotionPage(result, 'Promotion code redemption records are required');
}

export async function backendPromotionUserCouponsList(
  params?: Parameters<BackendPromotionsService['userCoupons']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.userCoupons.list(params);
  return readRequiredPromotionPage(result, 'Promotion user coupon records are required');
}

export async function backendPromotionCouponLedgerEntriesList(
  params?: Parameters<BackendPromotionsService['couponLedgerEntries']['list']>[0],
) {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponLedgerEntries.list(params);
  return readRequiredPromotionPage(result, 'Promotion coupon ledger records are required');
}

export async function backendPromotionBudgetLedgerEntriesList(
  params?: Parameters<ClawBackendPromotionsService['budgetLedgerEntries']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().promotions.budgetLedgerEntries.list(params);
  return readRequiredPromotionPage(result, 'Promotion budget ledger records are required');
}

export async function backendPromotionExternalBindingsList(
  params?: Parameters<ClawBackendPromotionsService['externalBindings']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().promotions.externalBindings.list(params);
  return readRequiredPromotionPage(result, 'Promotion external binding records are required');
}

export async function backendPromotionEventsList(
  params?: Parameters<ClawBackendPromotionsService['events']['list']>[0],
) {
  const result = await getClawRouterBackendSdkClient().promotions.events.list(params);
  return readRequiredPromotionPage(result, 'Promotion event records are required');
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

function readRequiredPromotionPage(result: unknown, message: string): PromotionPage {
  const payload = readApiData(result);
  if (!isRecord(payload) || !isRecord(payload['pageInfo'])) {
    throw new Error(`${message}: pageInfo is required`);
  }
  return {
    ...payload,
    items: readRequiredPromotionItems(payload, message),
    pageInfo: payload['pageInfo'],
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}
