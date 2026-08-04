import {
  getClawRouterBackendSdkClient,
  getSdkworkPromotionBackendSdkClient,
  isRecord,
  readApiData,
  readRequiredApiItems,
  readRequiredNonNegativeInt64String,
  readRequiredString,
  type ApiRecord,
  type SdkworkPromotionCouponStock,
  type SdkworkPromotionCouponStockRequest,
  type SdkworkPromotionCodeBatch,
  type SdkworkPromotionCodeBatchRequest,
  type SdkworkPromotionDistributionRequest,
  type SdkworkPromotionDistributionTask,
  type SdkworkPromotionOffer,
  type SdkworkPromotionOfferRequest,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendPromotionsService = ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions'];
type ClawBackendReferralStatsService = ReturnType<typeof getClawRouterBackendSdkClient>['billing']['referralStats'];
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
    params?: Parameters<ClawBackendReferralStatsService['list']>[0],
  ): Promise<ApiRecord & { items: ReferralStat[]; pageInfo: ApiRecord }> {
    const result = await getClawRouterBackendSdkClient().billing.referralStats.list(params);
    const page = readRequiredPromotionPage(result, 'Failed to fetch referral stats');
    return {
      ...page,
      items: page.items.map(normalizeReferralStat),
    };
  }
}

export async function backendPromotionOffersList(
  params?: Parameters<BackendPromotionsService['offers']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.list(params);
  return readRequiredPromotionPage(result, 'Promotion offer records are required');
}

export async function backendPromotionCouponStocksList(
  params?: Parameters<BackendPromotionsService['couponStocks']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponStocks.list(params);
  return readRequiredPromotionPage(result, 'Promotion coupon stock records are required');
}

export async function backendPromotionCodesList(
  params?: Parameters<BackendPromotionsService['codes']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.list(params);
  return readRequiredPromotionPage(result, 'Promotion code records are required');
}

export async function backendPromotionCodeBatchesList(
  params?: Parameters<BackendPromotionsService['codeBatches']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codeBatches.list(params);
  return readRequiredPromotionPage(result, 'Promotion code batch records are required');
}

export async function backendPromotionUserCouponsList(
  params?: Parameters<BackendPromotionsService['userCoupons']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.userCoupons.list(params);
  return readRequiredPromotionPage(result, 'Promotion user coupon records are required');
}

export async function backendPromotionDiscountApplicationsList(
  params?: Parameters<BackendPromotionsService['discountApplications']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.discountApplications.list(params);
  return readRequiredPromotionPage(result, 'Promotion discount application records are required');
}

export async function backendPromotionCouponLedgerEntriesList(
  params?: Parameters<BackendPromotionsService['couponLedgerEntries']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponLedgerEntries.list(params);
  return readRequiredPromotionPage(result, 'Promotion coupon ledger records are required');
}

export async function createPromotionOffer(input: SdkworkPromotionOfferRequest): Promise<SdkworkPromotionOffer> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.create(input);
  return readRequiredItem<SdkworkPromotionOffer>(result, 'Created promotion offer is required');
}

export async function createPromotionCouponStock(input: SdkworkPromotionCouponStockRequest): Promise<SdkworkPromotionCouponStock> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponStocks.create(input);
  return readRequiredItem<SdkworkPromotionCouponStock>(result, 'Created coupon stock is required');
}

export async function createPromotionCodeBatch(
  input: SdkworkPromotionCodeBatchRequest,
): Promise<SdkworkPromotionCodeBatch> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codeBatches.create(input);
  return readRequiredItem<SdkworkPromotionCodeBatch>(result, 'Created code batch is required');
}

export async function backendPromotionDistributionTasksList(
  params?: Parameters<BackendPromotionsService['distributionTasks']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.distributionTasks.list(params);
  return readRequiredPromotionPage(result, 'Promotion distribution task records are required');
}

export async function fetchPromotionOverview(): Promise<ApiRecord> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.overview.retrieve();
  const payload = readApiData(result);
  if (!isRecord(payload)) {
    throw new Error('Promotion overview is required');
  }
  return payload;
}

export async function retrievePromotionOffer(offerId: string): Promise<SdkworkPromotionOffer> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.retrieve(offerId);
  return readRequiredItem<SdkworkPromotionOffer>(result, 'Promotion offer is required');
}

export async function deletePromotionOffer(offerId: string): Promise<void> {
  await getSdkworkPromotionBackendSdkClient().promotions.offers.delete(offerId);
}

export async function createPromotionDistributionTask(
  input: SdkworkPromotionDistributionRequest,
): Promise<SdkworkPromotionDistributionTask> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.distributionTasks.create(input);
  return readRequiredItem<SdkworkPromotionDistributionTask>(result, 'Created distribution task is required');
}

export function buildDistributionTaskRequest(
  stockId: string,
  ownerUserIds: string[],
  idempotencyKey: string,
): SdkworkPromotionDistributionRequest {
  return { stockId, ownerUserIds, idempotencyKey };
}

export async function updatePromotionOfferStatus(offerId: string, status: 'active' | 'disabled'): Promise<void> {
  await getSdkworkPromotionBackendSdkClient().promotions.offers.status.update(offerId, { status });
}

export type CouponOfferBenefitKind = 'token_bank_credit' | 'subscription';
export type CouponCodeIssueMode = 'REALTIME' | 'BATCH';
export type CouponStockType = 'LIMITED' | 'UNLIMITED';

export interface CouponOfferCreateFormValues {
  displayName: string;
  offerType: string;
  description?: string;
  audienceScope: string;
  combinability: string;
  goodsScope: string;
  priority: number;
  startsAt: string;
  endsAt?: string;
  status: 'active' | 'disabled';
  benefitKind: CouponOfferBenefitKind;
  discountType: string;
  discountValue: string;
  minimumAmount: string;
  maximumDiscountAmount?: string;
  currencyCode: string;
  grantAmount?: string;
  productId?: string;
  skuId?: string;
  packageId?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  durationDays?: string;
  dailyQuota?: string;
  totalQuota?: string;
  stockType: CouponStockType;
  codeIssueMode: CouponCodeIssueMode;
  totalQuantity: string;
  perUserLimit: number;
  claimStartsAt?: string;
  claimEndsAt?: string;
  batchQuantity?: string;
  batchCodeLength?: number;
  batchCodePrefix?: string;
  batchStartsAt?: string;
  batchExpiresAt?: string;
}

export interface CouponOfferCreateRequests {
  offerRequest: SdkworkPromotionOfferRequest;
  stockRequest: SdkworkPromotionCouponStockRequest;
  codeBatchRequest?: SdkworkPromotionCodeBatchRequest;
}

export function buildCouponOfferCreateRequests(
  values: CouponOfferCreateFormValues,
  idempotencyKey: string,
): CouponOfferCreateRequests {
  const couponBenefit = values.benefitKind === 'token_bank_credit'
    ? { kind: 'token_bank_credit' as const, grantAmount: values.grantAmount ?? '' }
    : {
        kind: 'subscription' as const,
        productId: values.productId ?? '',
        skuId: values.skuId ?? '',
        packageId: values.packageId ?? '',
        period: values.period ?? 'month',
        durationDays: values.durationDays ?? '0',
        dailyQuota: values.dailyQuota ?? '0',
        totalQuota: values.totalQuota ?? '0',
      };
  const offerRequest: SdkworkPromotionOfferRequest = {
    offerType: values.offerType,
    displayName: values.displayName,
    description: values.description || null,
    audienceScope: values.audienceScope,
    combinability: values.combinability,
    goodsScope: values.goodsScope,
    priority: values.priority,
    startsAt: toIsoString(values.startsAt),
    endsAt: values.endsAt ? toIsoString(values.endsAt) : null,
    status: values.status,
    discountType: values.discountType,
    discountValue: values.discountValue,
    minimumAmount: values.minimumAmount,
    maximumDiscountAmount: values.maximumDiscountAmount || null,
    currencyCode: values.currencyCode,
    couponBenefit,
  };
  const stockRequest: SdkworkPromotionCouponStockRequest = {
    offerId: '',
    stockType: values.stockType,
    codeIssueMode: values.codeIssueMode,
    // UNLIMITED 库存总量仅作统计，传 0
    totalQuantity: values.stockType === 'UNLIMITED' ? '0' : values.totalQuantity,
    perUserLimit: values.perUserLimit,
    claimStartsAt: values.claimStartsAt ? toIsoString(values.claimStartsAt) : null,
    claimEndsAt: values.claimEndsAt ? toIsoString(values.claimEndsAt) : null,
    status: values.status,
  };
  const codeBatchRequest: SdkworkPromotionCodeBatchRequest | undefined = values.codeIssueMode === 'BATCH'
    ? {
        stockId: '',
        codeType: 'PUBLIC',
        quantity: values.batchQuantity ?? '',
        codeLength: values.batchCodeLength ?? 16,
        codePrefix: values.batchCodePrefix ?? '',
        startsAt: values.batchStartsAt ? toIsoString(values.batchStartsAt) : null,
        expiresAt: values.batchExpiresAt ? toIsoString(values.batchExpiresAt) : null,
        idempotencyKey,
      }
    : undefined;
  return { offerRequest, stockRequest, codeBatchRequest };
}

export async function createCouponOffer(
  values: CouponOfferCreateFormValues,
  idempotencyKey: string,
): Promise<{ offer: SdkworkPromotionOffer; stock: SdkworkPromotionCouponStock; codeBatch?: SdkworkPromotionCodeBatch }> {
  const requests = buildCouponOfferCreateRequests(values, idempotencyKey);
  const offer = await createPromotionOffer(requests.offerRequest);
  const stock = await createPromotionCouponStock({
    ...requests.stockRequest,
    offerId: offer.id,
  });
  let codeBatch: SdkworkPromotionCodeBatch | undefined;
  if (requests.codeBatchRequest) {
    codeBatch = await createPromotionCodeBatch({
      ...requests.codeBatchRequest,
      stockId: stock.id,
    });
  }
  return { offer, stock, codeBatch };
}

export interface CodeBatchCreateFormValues {
  stockId: string;
  codeType: string;
  quantity: string;
  codeLength: number;
  codePrefix: string;
  startsAt?: string;
  expiresAt?: string;
}

export function buildCodeBatchCreateRequest(
  values: CodeBatchCreateFormValues,
  idempotencyKey: string,
): SdkworkPromotionCodeBatchRequest {
  return {
    stockId: values.stockId,
    codeType: values.codeType,
    quantity: values.quantity,
    codeLength: values.codeLength,
    codePrefix: values.codePrefix,
    startsAt: values.startsAt ? toIsoString(values.startsAt) : null,
    expiresAt: values.expiresAt ? toIsoString(values.expiresAt) : null,
    idempotencyKey,
  };
}

/** ISO 时间 → 本地 datetime-local 输入值（YYYY-MM-DDTHH:mm）。 */
export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 将后端优惠券记录映射为创建表单初始值（用于复制优惠券）。 */
export function offerRecordToFormValues(record: ApiRecord): CouponOfferCreateFormValues {
  const benefit = isRecord(record['coupon_benefit']) ? record['coupon_benefit'] : null;
  const benefitKind: CouponOfferBenefitKind = benefit?.['kind'] === 'subscription' ? 'subscription' : 'token_bank_credit';
  return {
    displayName: `${String(record['display_name'] ?? '')} (Copy)`,
    offerType: String(record['offer_type'] ?? 'COUPON'),
    description: record['description'] ? String(record['description']) : '',
    audienceScope: String(record['audience_scope'] ?? 'ALL'),
    combinability: String(record['combinability'] ?? 'EXCLUSIVE'),
    goodsScope: String(record['goods_scope'] ?? 'ALL'),
    priority: Number(record['priority'] ?? 100),
    startsAt: toDatetimeLocal(String(record['starts_at'] ?? '')),
    endsAt: record['ends_at'] ? toDatetimeLocal(String(record['ends_at'])) : '',
    status: record['status'] === 'disabled' ? 'disabled' : 'active',
    benefitKind,
    discountType: String(record['discount_type'] ?? 'FIXED'),
    discountValue: String(record['discount_value'] ?? ''),
    minimumAmount: String(record['minimum_amount'] ?? '0'),
    maximumDiscountAmount: record['maximum_discount_amount'] ? String(record['maximum_discount_amount']) : '',
    currencyCode: String(record['currency_code'] ?? 'CNY'),
    grantAmount: benefitKind === 'token_bank_credit' && benefit ? String(benefit['grantAmount'] ?? '') : '',
    productId: benefitKind === 'subscription' && benefit ? String(benefit['productId'] ?? '') : '',
    skuId: benefitKind === 'subscription' && benefit ? String(benefit['skuId'] ?? '') : '',
    packageId: benefitKind === 'subscription' && benefit ? String(benefit['packageId'] ?? '') : '',
    period: benefitKind === 'subscription' && benefit
      ? (benefit['period'] as 'day' | 'week' | 'month' | 'year' | undefined) ?? 'month'
      : 'month',
    durationDays: benefitKind === 'subscription' && benefit ? String(benefit['durationDays'] ?? '') : '30',
    dailyQuota: benefitKind === 'subscription' && benefit ? String(benefit['dailyQuota'] ?? '') : '',
    totalQuota: benefitKind === 'subscription' && benefit ? String(benefit['totalQuota'] ?? '') : '',
    stockType: 'LIMITED',
    codeIssueMode: 'REALTIME',
    totalQuantity: '',
    perUserLimit: 1,
    claimStartsAt: '',
    claimEndsAt: '',
  };
}

export function toIsoString(datetimeLocal: string): string {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date time value');
  }
  return date.toISOString();
}

/** 生成幂等键：优先 crypto.randomUUID（安全上下文），非安全上下文回退随机串。 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function maskPromotionCode(value: string): string {
  const length = value.length;
  if (length <= 8) {
    return '****';
  }
  return `${value.slice(0, 4)}****${value.slice(length - 4)}`;
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

function readRequiredItem<T>(result: unknown, message: string): T {
  const payload = readApiData(result);
  if (!isRecord(payload)) {
    throw new Error(`${message}: item is required`);
  }
  return payload as T;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}
