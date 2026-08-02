import {
  getClawRouterBackendSdkClient,
  getSdkworkPromotionBackendSdkClient,
  isRecord,
  readApiData,
  readRequiredApiItems,
  readRequiredNonNegativeInt64String,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendPromotionsService = ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions'];
type ClawBackendMarketingService = ReturnType<typeof getClawRouterBackendSdkClient>['system']['marketing'];
type PromotionPage = ApiRecord & { items: ApiRecord[]; pageInfo: ApiRecord };

export interface ReferralStat {
  id: string;
  inviter: string;
  totalInvited: string;
  totalRevenue: string;
  bonusAwarded: string;
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

function normalizeReferralStat(value: unknown): ReferralStat {
  const item = readRequiredRecord(value, 'Referral stat record is required');
  return {
    id: readRequiredString(item, 'id', 'Referral stat id is required'),
    inviter: readRequiredString(item, 'inviter', 'Referral inviter is required'),
    totalInvited: readRequiredNonNegativeInt64String(item, 'totalInvited', 'Referral invited total is required'),
    totalRevenue: readRequiredString(item, 'totalRevenue', 'Referral revenue is required'),
    bonusAwarded: readRequiredString(item, 'bonusAwarded', 'Referral bonus is required'),
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
