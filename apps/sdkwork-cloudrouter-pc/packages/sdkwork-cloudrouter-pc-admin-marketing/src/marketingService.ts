import {
  getCloudRouterBackendSdkClient,
  getSdkworkPromotionBackendSdkClient,
  isRecord,
  readApiData,
  readRequiredApiItems,
  readRequiredNonNegativeInt64String,
  readRequiredString,
  type ApiRecord,
  type SdkworkPromotionCampaign,
  type SdkworkPromotionCampaignRequest,
  type SdkworkPromotionCodeBatch,
  type SdkworkPromotionCodeBatchRequest,
  type SdkworkPromotionCouponBenefitRequest,
  type SdkworkPromotionCouponStock,
  type SdkworkPromotionCouponStockRequest,
  type SdkworkPromotionDistributionRequest,
  type SdkworkPromotionDistributionTask,
  type SdkworkPromotionOffer,
  type SdkworkPromotionOfferRequest,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { formatMoneyMinorUnits } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';

type BackendPromotionsService = ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions'];
type CloudBackendReferralStatsService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralStats'];
type CloudBackendReferralRelationsService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralRelations'];
type CloudBackendReferralStrategiesService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralStrategies'];
type PromotionPage = ApiRecord & { items: ApiRecord[]; pageInfo: ApiRecord };

export interface ReferralStat {
  id: string;
  inviter: string;
  totalInvited: string;
  totalRevenue: string;
  bonusAwarded: string;
  link: string;
}

export interface ReferralRelation {
  id: string;
  inviter: string;
  invitee: string;
  inviteCode: string;
  source: string;
  rewardStatus: string;
  claimedAt: string;
}

export type ReferralStrategyStatus = 'active' | 'disabled';
export type ReferralStrategyRewardType = 'POINTS' | 'CASH' | 'COUPON';
export type ReferralStrategyRewardTarget = 'INVITER' | 'INVITEE';

export interface ReferralStrategy {
  id: string;
  name: string;
  description: string;
  status: ReferralStrategyStatus;
  rewardType: ReferralStrategyRewardType;
  rewardValue: string;
  rewardTarget: ReferralStrategyRewardTarget;
  triggerEvent: string;
  maxRewardsPerInviter: string;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
}

export interface ReferralStrategyMutation {
  name?: string;
  description?: string;
  status?: ReferralStrategyStatus;
  rewardType?: ReferralStrategyRewardType;
  rewardValue?: string;
  rewardTarget?: ReferralStrategyRewardTarget;
  triggerEvent?: string;
  maxRewardsPerInviter?: number;
  startsAt?: string;
  endsAt?: string;
}

export class MarketingService {
  static async fetchReferralStats(
    params?: Parameters<CloudBackendReferralStatsService['list']>[0],
  ): Promise<ApiRecord & { items: ReferralStat[]; pageInfo: ApiRecord }> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStats.list(params);
    const page = readRequiredPromotionPage(result, 'Failed to fetch referral stats');
    return {
      ...page,
      items: page.items.map(normalizeReferralStat),
    };
  }

  static async fetchReferralRelations(
    params?: Parameters<CloudBackendReferralRelationsService['list']>[0],
  ): Promise<ApiRecord & { items: ReferralRelation[]; pageInfo: ApiRecord }> {
    const result = await getCloudRouterBackendSdkClient().billing.referralRelations.list(params);
    const page = readRequiredPromotionPage(result, 'Failed to fetch referral relations');
    return {
      ...page,
      items: page.items.map(normalizeReferralRelation),
    };
  }

  static async fetchReferralStrategies(
    params?: Parameters<CloudBackendReferralStrategiesService['list']>[0],
  ): Promise<ApiRecord & { items: ReferralStrategy[]; pageInfo: ApiRecord }> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStrategies.list(params);
    const page = readRequiredPromotionPage(result, 'Failed to fetch referral strategies');
    return {
      ...page,
      items: page.items.map(normalizeReferralStrategy),
    };
  }

  static async createReferralStrategy(
    input: ReferralStrategyMutation,
  ): Promise<ReferralStrategy> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStrategies.create(input);
    return normalizeReferralStrategy(readRequiredRecord(readApiData(result), 'Created referral strategy is required'));
  }

  static async retrieveReferralStrategy(strategyId: string): Promise<ReferralStrategy> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStrategies.retrieve(strategyId);
    return normalizeReferralStrategy(readRequiredRecord(readApiData(result), 'Referral strategy is required'));
  }

  static async updateReferralStrategy(
    strategyId: string,
    input: ReferralStrategyMutation,
  ): Promise<ReferralStrategy> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStrategies.update(strategyId, input);
    return normalizeReferralStrategy(readRequiredRecord(readApiData(result), 'Updated referral strategy is required'));
  }

  static async deleteReferralStrategy(strategyId: string): Promise<void> {
    await getCloudRouterBackendSdkClient().billing.referralStrategies.delete(strategyId);
  }

  static async updateReferralStrategyStatus(
    strategyId: string,
    status: ReferralStrategyStatus,
  ): Promise<ReferralStrategy> {
    return MarketingService.updateReferralStrategy(strategyId, { status });
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
  return toCamelCaseRecord(payload);
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

export type CouponOfferBenefitKind = 'token_bank_credit' | 'points_credit' | 'cash_credit' | 'subscription';
export type CouponCodeIssueMode = 'realtime' | 'batch';
export type CouponStockType = 'limited' | 'unlimited';

export interface CouponOfferCreateFormValues {
  campaignId?: string;
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
  /** Token Bank 额度券：发放额度（整数最小单位）；现金券：发放金额（元，提交时转为最小单位）。 */
  grantAmount?: string;
  /** Token Bank 额度券：赠送额度（可选，整数最小单位）。 */
  bonusAmount?: string;
  /** 积分券：发放积分（整数）。 */
  grantPoints?: string;
  /** 现金券/Token Bank 额度券使用的币种（现金券以元为单位输入）。 */
  currencyCode: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
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
  const offerRequest: SdkworkPromotionOfferRequest = {
    campaignId: values.campaignId?.trim() || undefined,
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
    // 满减/折扣抵扣字段为二期预留：发放型券统一按无门槛固定抵扣提交默认值
    discountType: 'FIXED',
    discountValue: '0',
    minimumAmount: '0',
    maximumDiscountAmount: null,
    currencyCode: values.currencyCode,
    couponBenefit: buildCouponBenefit(values),
  };
  const stockRequest: SdkworkPromotionCouponStockRequest = {
    offerId: '',
    stockType: values.stockType,
    codeIssueMode: values.codeIssueMode,
    // UNLIMITED 库存总量仅作统计，传 0
    totalQuantity: values.stockType === 'unlimited' ? '0' : values.totalQuantity,
    perUserLimit: values.perUserLimit,
    claimStartsAt: values.claimStartsAt ? toIsoString(values.claimStartsAt) : null,
    claimEndsAt: values.claimEndsAt ? toIsoString(values.claimEndsAt) : null,
    status: values.status,
  };
  const codeBatchRequest: SdkworkPromotionCodeBatchRequest | undefined = values.codeIssueMode === 'batch'
    ? {
        stockId: '',
        codeType: 'PUBLIC',
        requestedQuantity: values.batchQuantity ?? '',
        codeLength: values.batchCodeLength ?? 16,
        codePrefix: values.batchCodePrefix ?? '',
        startsAt: values.batchStartsAt ? toIsoString(values.batchStartsAt) : null,
        expiresAt: values.batchExpiresAt ? toIsoString(values.batchExpiresAt) : null,
        idempotencyKey,
      }
    : undefined;
  return { offerRequest, stockRequest, codeBatchRequest };
}

/** 按券类型构建权益载荷：现金券金额（元）转换为最小单位（分），Token Bank 赠送额度可省略。 */
function buildCouponBenefit(values: CouponOfferCreateFormValues): SdkworkPromotionCouponBenefitRequest {
  switch (values.benefitKind) {
    case 'token_bank_credit':
      return values.bonusAmount?.trim()
        ? {
            kind: 'token_bank_credit',
            grantAmount: values.grantAmount?.trim() || '',
            bonusAmount: values.bonusAmount.trim(),
          }
        : {
            kind: 'token_bank_credit',
            grantAmount: values.grantAmount?.trim() || '',
          };
    case 'points_credit':
      return {
        kind: 'points_credit',
        grantPoints: values.grantPoints?.trim() || '',
      };
    case 'cash_credit':
      return {
        kind: 'cash_credit',
        grantAmount: yuanToMinorUnits(values.grantAmount),
      };
    case 'subscription':
      return {
        kind: 'subscription',
        period: values.period ?? 'month',
        durationDays: values.durationDays ?? '0',
        dailyQuota: values.dailyQuota ?? '0',
        totalQuota: values.totalQuota ?? '0',
      };
  }
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
    requestedQuantity: values.quantity,
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

/** 元金额（最多两位小数）→ 最小单位（分）字符串；空值返回空串。 */
export function yuanToMinorUnits(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    return '';
  }
  const [whole, fraction = ''] = normalized.split('.');
  const cents = `${whole}${fraction.padEnd(2, '0').slice(0, 2)}`;
  return cents.replace(/^0+(?=\d)/, '') || '0';
}

/** 最小单位（分）字符串 → 元金额字符串（最多两位小数）；空值返回空串。 */
export function minorUnitsToYuan(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return '';
  }
  const padded = normalized.padStart(3, '0');
  const whole = padded.slice(0, -2);
  const fraction = padded.slice(-2);
  return `${whole.replace(/^0+(?=\d)/, '') || '0'}.${fraction}`;
}

/** 最小单位金额 + 币种 → 本地化金额文案（如 "5.00 CNY"）；无效值回退 '-'。 */
export function formatMarketingAmountMinor(
  value: string | undefined,
  currency: string,
  locale: string,
): string {
  const normalized = value?.trim();
  const minor = Number(normalized);
  if (!normalized || !Number.isInteger(minor)) {
    return '-';
  }
  const currencyCode = currency || 'CNY';
  const amount = formatMoneyMinorUnits(minor, currencyCode, locale, 'decimal');
  return amount ? `${amount} ${currencyCode}` : `${String(value)} ${currencyCode}`;
}

/** 从 offer 记录中读取结构化的券权益信息（用于列表与详情展示）。 */
export interface CouponBenefitDisplay {
  kind: CouponOfferBenefitKind;
  /** Token Bank 额度券发放额度 / 现金券最小单位金额。 */
  grantAmount?: string;
  /** Token Bank 额度券赠送额度。 */
  bonusAmount?: string;
  /** 积分券发放积分。 */
  grantPoints?: string;
  period?: string;
  durationDays?: string;
  dailyQuota?: string;
  totalQuota?: string;
}

export function readCouponBenefit(record: ApiRecord): CouponBenefitDisplay | null {
  // 响应契约为 camelCase（couponBenefit）；兼容历史 snake_case 数据
  const benefit = isRecord(record['couponBenefit'])
    ? record['couponBenefit']
    : isRecord(record['coupon_benefit'])
      ? record['coupon_benefit']
      : null;
  if (!benefit) {
    return null;
  }
  const kind = benefit['kind'];
  if (kind !== 'points_credit' && kind !== 'cash_credit' && kind !== 'subscription') {
    return {
      kind: 'token_bank_credit',
      grantAmount: benefit['grantAmount'] ? String(benefit['grantAmount']) : undefined,
      bonusAmount: benefit['bonusAmount'] ? String(benefit['bonusAmount']) : undefined,
    };
  }
  return {
    kind,
    grantAmount: benefit['grantAmount'] ? String(benefit['grantAmount']) : undefined,
    bonusAmount: benefit['bonusAmount'] ? String(benefit['bonusAmount']) : undefined,
    grantPoints: benefit['grantPoints'] ? String(benefit['grantPoints']) : undefined,
    period: benefit['period'] ? String(benefit['period']) : undefined,
    durationDays: benefit['durationDays'] !== undefined && benefit['durationDays'] !== null
      ? String(benefit['durationDays'])
      : undefined,
    dailyQuota: benefit['dailyQuota'] ? String(benefit['dailyQuota']) : undefined,
    totalQuota: benefit['totalQuota'] ? String(benefit['totalQuota']) : undefined,
  };
}

/** 将后端记录的 snake_case 键归一化为 camelCase（幂等：已 camelCase 的键保持不变）。 */
export function toCamelCaseRecord(record: ApiRecord): ApiRecord {
  const normalized: ApiRecord = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = value;
  }
  return normalized;
}

/** 将后端优惠券记录映射为创建表单初始值（用于复制优惠券）。copySuffix 为展示名称追加的本地化后缀。 */
export function offerRecordToFormValues(
  record: ApiRecord,
  copySuffix = ' (Copy)',
): CouponOfferCreateFormValues {
  const benefit = readCouponBenefit(record);
  const kind = benefit?.kind;
  const benefitKind: CouponOfferBenefitKind =
    kind === 'points_credit' || kind === 'cash_credit' || kind === 'subscription'
      ? kind
      : 'token_bank_credit';
  return {
    campaignId: record['campaignId'] ? String(record['campaignId']) : '',
    displayName: `${String(record['displayName'] ?? '')}${copySuffix}`,
    offerType: String(record['offerType'] ?? 'COUPON'),
    description: record['description'] ? String(record['description']) : '',
    audienceScope: String(record['audienceScope'] ?? 'ALL'),
    combinability: String(record['combinability'] ?? 'EXCLUSIVE'),
    goodsScope: String(record['goodsScope'] ?? 'ALL'),
    priority: Number(record['priority'] ?? 100),
    startsAt: toDatetimeLocal(String(record['startsAt'] ?? '')),
    endsAt: record['endsAt'] ? toDatetimeLocal(String(record['endsAt'])) : '',
    status: record['status'] === 'disabled' ? 'disabled' : 'active',
    benefitKind,
    currencyCode: String(record['currencyCode'] ?? 'CNY'),
    // 现金券金额后端存最小单位（分），表单以元输入，回读时换算
    grantAmount: benefitKind === 'cash_credit'
      ? minorUnitsToYuan(benefit?.grantAmount)
      : benefit?.grantAmount ?? '',
    bonusAmount: benefit?.bonusAmount ?? '',
    grantPoints: benefit?.grantPoints ?? '',
    period: benefitKind === 'subscription' && benefit
      ? (benefit.period as 'day' | 'week' | 'month' | 'year' | undefined) ?? 'month'
      : 'month',
    durationDays: benefitKind === 'subscription' && benefit ? String(benefit.durationDays ?? '') : '30',
    dailyQuota: benefitKind === 'subscription' && benefit ? String(benefit.dailyQuota ?? '') : '',
    totalQuota: benefitKind === 'subscription' && benefit ? String(benefit.totalQuota ?? '') : '',
    stockType: 'limited',
    codeIssueMode: 'realtime',
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

/** 生成幂等键：优先 crypto.randomUUID（安全上下文），非安全上下文回退加密随机串。 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `mk-${Date.now().toString(36)}-${hex}`;
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

function normalizeReferralRelation(value: unknown): ReferralRelation {
  const item = readRequiredRecord(value, 'Referral relation record is required');
  return {
    id: readRequiredString(item, 'id', 'Referral relation id is required'),
    inviter: readRequiredString(item, 'inviter', 'Referral relation inviter is required'),
    invitee: readRequiredString(item, 'invitee', 'Referral relation invitee is required'),
    inviteCode: readRequiredString(item, 'inviteCode', 'Referral relation invite code is required'),
    source: readRequiredString(item, 'source', 'Referral relation source is required'),
    rewardStatus: readRequiredString(item, 'rewardStatus', 'Referral relation reward status is required'),
    claimedAt: normalizeDatetime(readRequiredString(item, 'claimedAt', 'Referral relation claimed time is required')),
  };
}

function normalizeReferralStrategy(value: unknown): ReferralStrategy {
  const item = readRequiredRecord(value, 'Referral strategy record is required');
  return {
    id: readRequiredString(item, 'id', 'Referral strategy id is required'),
    name: readRequiredString(item, 'name', 'Referral strategy name is required'),
    description: readRequiredString(item, 'description', 'Referral strategy description is required'),
    status: readReferralStrategyStatus(item),
    rewardType: readReferralStrategyRewardType(item),
    rewardValue: readRequiredString(item, 'rewardValue', 'Referral strategy reward value is required'),
    rewardTarget: readReferralStrategyRewardTarget(item),
    triggerEvent: readRequiredString(item, 'triggerEvent', 'Referral strategy trigger event is required'),
    maxRewardsPerInviter: readRequiredNonNegativeInt64String(item, 'maxRewardsPerInviter', 'Referral strategy max rewards is required'),
    startsAt: normalizeDatetime(readRequiredString(item, 'startsAt', 'Referral strategy starts at is required')),
    endsAt: normalizeDatetime(readRequiredString(item, 'endsAt', 'Referral strategy ends at is required')),
    updatedAt: normalizeDatetime(readRequiredString(item, 'updatedAt', 'Referral strategy updated at is required')),
  };
}

/**
 * Normalizes backend datetimes (PostgreSQL `::text` renders `YYYY-MM-DD
 * HH:MM:SS+00` with a space separator) to ISO-8601 so list cells format as
 * local time and edit forms can parse them; empty values stay empty.
 */
function normalizeDatetime(value: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function readReferralStrategyStatus(item: ApiRecord): ReferralStrategyStatus {
  const value = readRequiredString(item, 'status', 'Referral strategy status is required');
  if (value === 'active' || value === 'disabled') {
    return value;
  }
  return 'disabled';
}

function readReferralStrategyRewardType(item: ApiRecord): ReferralStrategyRewardType {
  const value = readRequiredString(item, 'rewardType', 'Referral strategy reward type is required');
  if (value === 'POINTS' || value === 'CASH' || value === 'COUPON') {
    return value;
  }
  return 'POINTS';
}

function readReferralStrategyRewardTarget(item: ApiRecord): ReferralStrategyRewardTarget {
  const value = readRequiredString(item, 'rewardTarget', 'Referral strategy reward target is required');
  if (value === 'INVITER' || value === 'INVITEE') {
    return value;
  }
  return 'INVITER';
}

function readRequiredPromotionItems(result: unknown, message: string): ApiRecord[] {
  return readRequiredApiItems(result, message)
    .map((value) => {
      const item = readRequiredRecord(value, message);
      readRequiredString(item, 'id', 'Promotion record id is required');
      return toCamelCaseRecord(item);
    });
}

function readRequiredPromotionPage(result: unknown, message: string): PromotionPage {
  const payload = readApiData(result);
  if (!isRecord(payload) || !isRecord(payload['pageInfo'])) {
    throw new Error(`${message}: pageInfo is required`);
  }
  return {
    ...toCamelCaseRecord(payload),
    items: readRequiredPromotionItems(payload, message),
    pageInfo: toCamelCaseRecord(payload['pageInfo']),
  };
}

function readRequiredItem<T>(result: unknown, message: string): T {
  const payload = readApiData(result);
  if (!isRecord(payload)) {
    throw new Error(`${message}: item is required`);
  }
  return toCamelCaseRecord(payload) as T;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}


/** 会员活动（Campaign）创建/编辑表单值。 */
export interface CampaignFormValues {
  displayName: string;
  description?: string;
  channelScope: string;
  audienceScope: string;
  startsAt: string;
  endsAt?: string;
  status: string;
}

export async function backendPromotionCampaignsList(
  params?: Parameters<BackendPromotionsService['campaigns']['list']>[0],
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.campaigns.list(params);
  return readRequiredPromotionPage(result, 'Promotion campaign records are required');
}

export async function retrievePromotionCampaign(campaignId: string): Promise<SdkworkPromotionCampaign> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.campaigns.retrieve(campaignId);
  return readRequiredItem<SdkworkPromotionCampaign>(result, 'Promotion campaign is required');
}

export async function createPromotionCampaign(input: SdkworkPromotionCampaignRequest): Promise<SdkworkPromotionCampaign> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.campaigns.create(input);
  return readRequiredItem<SdkworkPromotionCampaign>(result, 'Created promotion campaign is required');
}

export async function updatePromotionCampaign(
  campaignId: string,
  input: SdkworkPromotionCampaignRequest,
): Promise<SdkworkPromotionCampaign> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.campaigns.update(campaignId, input);
  return readRequiredItem<SdkworkPromotionCampaign>(result, 'Updated promotion campaign is required');
}

export async function deletePromotionCampaign(campaignId: string): Promise<void> {
  await getSdkworkPromotionBackendSdkClient().promotions.campaigns.delete(campaignId);
}

export function buildCampaignRequest(values: CampaignFormValues): SdkworkPromotionCampaignRequest {
  return {
    displayName: values.displayName,
    description: values.description || null,
    channelScope: values.channelScope,
    audienceScope: values.audienceScope,
    startsAt: toIsoString(values.startsAt),
    endsAt: values.endsAt ? toIsoString(values.endsAt) : null,
    status: values.status,
  };
}

/** 后端活动记录 → 表单初始值（用于编辑）。 */
export function campaignRecordToFormValues(record: ApiRecord): CampaignFormValues {
  return {
    displayName: String(record['displayName'] ?? ''),
    description: record['description'] ? String(record['description']) : '',
    channelScope: String(record['channelScope'] ?? 'ALL'),
    audienceScope: String(record['audienceScope'] ?? 'ALL'),
    startsAt: toDatetimeLocal(String(record['startsAt'] ?? '')),
    endsAt: record['endsAt'] ? toDatetimeLocal(String(record['endsAt'])) : '',
    status: String(record['status'] ?? 'draft'),
  };
}
