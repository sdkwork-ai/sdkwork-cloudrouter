import {
  getCloudRouterBackendSdkClient,
  getSdkworkPromotionBackendSdkClient,
  isRecord,
  readApiData,
  readBoolean,
  readRequiredApiItems,
  readRequiredNonNegativeInt64String,
  readRequiredNonNegativeNumber,
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
import { uuid } from '@sdkwork/utils/id';

type BackendPromotionsService = ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions'];
type CloudBackendReferralStatsService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralStats'];
type CloudBackendReferralRelationsService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralRelations'];
type CloudBackendReferralStrategiesService = ReturnType<typeof getCloudRouterBackendSdkClient>['billing']['referralStrategies'];
type PromotionPage = ApiRecord & { items: ApiRecord[]; pageInfo: ApiRecord };

type PromotionOffersListParams = NonNullable<Parameters<BackendPromotionsService['offers']['list']>[0]>;
type PromotionCouponStocksListParams = NonNullable<Parameters<BackendPromotionsService['couponStocks']['list']>[0]>;
type PromotionCodesListParams = NonNullable<Parameters<BackendPromotionsService['codes']['list']>[0]>;
type PromotionCodeBatchesListParams = NonNullable<Parameters<BackendPromotionsService['codeBatches']['list']>[0]>;
type PromotionUserCouponsListParams = NonNullable<Parameters<BackendPromotionsService['userCoupons']['list']>[0]>;
type PromotionDiscountApplicationsListParams = NonNullable<Parameters<BackendPromotionsService['discountApplications']['list']>[0]>;
type PromotionCouponLedgerEntriesListParams = NonNullable<Parameters<BackendPromotionsService['couponLedgerEntries']['list']>[0]>;
type PromotionRedemptionAttemptsListParams = NonNullable<Parameters<BackendPromotionsService['redemptionAttempts']['list']>[0]>;
type PromotionDistributionTasksListParams = NonNullable<Parameters<BackendPromotionsService['distributionTasks']['list']>[0]>;
type PromotionCampaignsListParams = NonNullable<Parameters<BackendPromotionsService['campaigns']['list']>[0]>;
type ReferralStrategiesListParams = NonNullable<Parameters<CloudBackendReferralStrategiesService['list']>[0]>;

/**
 * 促销列表查询参数：`status` 是各资源自己的状态值（用户券 claimed/redeemed/…、
 * 抵扣申请 applied/…、活动 draft/…），后端按大小写敏感等值过滤，因此不能收窄成
 * active|disabled。生成 SDK 把每个列表的 status 统一声明为 `'active' | 'disabled'`，
 * 这里只放宽这一个键，其余分页与检索参数仍由生成类型约束。
 */
export type PromotionListQuery<TParams extends { status?: unknown }> =
  Omit<TParams, 'status'> & { status?: string };

/**
 * 抵扣申请（核销记录）列表查询：在分页/检索/状态之外，生成 SDK 额外支持
 * `codeId` / `userCouponId` / `orderId`，wire 参数名分别为
 * `code_id` / `user_coupon_id` / `order_id`。三者都是可选精确匹配。
 */
export type PromotionDiscountApplicationsListQuery =
  PromotionListQuery<PromotionDiscountApplicationsListParams>;

/**
 * 兑换尝试列表查询参数：直接取生成 SDK 的 `redemptionAttempts.list` 入参。
 * `outcome` 是闭集 `succeeded | failed`（后端对集合外的值返回 400），因此这里
 * 不做 `PromotionListQuery` 式的放宽，也不把它映射成 `status`。
 */
export type PromotionRedemptionAttemptsListQuery = PromotionRedemptionAttemptsListParams;

/** 兑换尝试结果闭集，用于页面筛选状态到 `outcome` 查询参数的收窄。 */
export type PromotionRedemptionAttemptOutcome = NonNullable<PromotionRedemptionAttemptsListQuery['outcome']>;

/**
 * 把放宽后的查询交给生成 SDK：`status` 值原样进入 query（wire 参数名仍为
 * `status`），不做大小写或词表映射；这是本模块唯一的类型放宽边界。
 */
function withPromotionStatusQuery<TParams extends { status?: unknown }>(
  params: PromotionListQuery<TParams> | undefined,
): TParams | undefined {
  return params as TParams | undefined;
}


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
    params?: PromotionListQuery<ReferralStrategiesListParams>,
  ): Promise<ApiRecord & { items: ReferralStrategy[]; pageInfo: ApiRecord }> {
    const result = await getCloudRouterBackendSdkClient().billing.referralStrategies.list(
      withPromotionStatusQuery<ReferralStrategiesListParams>(params),
    );
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
  params?: PromotionListQuery<PromotionOffersListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.list(
    withPromotionStatusQuery<PromotionOffersListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion offer records are required');
}

export async function backendPromotionCouponStocksList(
  params?: PromotionListQuery<PromotionCouponStocksListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponStocks.list(
    withPromotionStatusQuery<PromotionCouponStocksListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion coupon stock records are required');
}

export async function backendPromotionCodesList(
  params?: PromotionListQuery<PromotionCodesListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.list(
    withPromotionStatusQuery<PromotionCodesListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion code records are required');
}

export async function backendPromotionCodeBatchesList(
  params?: PromotionListQuery<PromotionCodeBatchesListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codeBatches.list(
    withPromotionStatusQuery<PromotionCodeBatchesListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion code batch records are required');
}

/**
 * 审计揭示结果（`codes.reveals.create`）。
 *
 * 完整可兑换券码只出现在该返回（及等价的受审计导出）中；列表响应的
 * `promotionCode` 已废弃，不得再作为展示或复制来源。
 */
export interface PromotionCodeReveal {
  /** 人类可读的券码编号（`promotion_code.code_no`）。 */
  codeNo: string;
  /** 完整可兑换券码。 */
  code: string;
}

/**
 * 审计导出结果（`codeBatches.codeExports.create`）。
 *
 * 服务端按 `codeNo` 排序并封顶 5000 条；批次超过上限时 `truncated` 为 true。
 */
export interface PromotionCodeExport {
  items: PromotionCodeReveal[];
  /** 实际返回条数（不会超过 5000）。 */
  count: number;
  /** 批次券码数超过 5000 条上限时为 true。 */
  truncated: boolean;
}

/**
 * 揭示单个券码（`codes.reveals.create`，权限 `commerce.marketing.manage`）。
 *
 * 每次调用都会写入审计事件，因此完整券码只能在运营明确点击“揭示”后获取，
 * 不能从列表响应中取得。`codeId` 是券码记录 id（int64 十进制字符串）。
 */
export async function backendRevealPromotionCode(codeId: string): Promise<PromotionCodeReveal> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.reveals.create(codeId);
  return readRequiredCodeReveal(result, 'Revealed promotion code is required');
}

/**
 * 导出批次券码（`codeBatches.codeExports.create`，权限 `commerce.marketing.manage`）。
 *
 * 每次调用都会写入审计事件，返回的完整券码由调用方构造成 CSV；不存在
 * “从列表数据直接导出完整券码”的路径。服务端上限 5000 条。
 */
export async function backendExportPromotionBatchCodes(batchId: string): Promise<PromotionCodeExport> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codeBatches.codeExports.create(batchId);
  return readRequiredCodeExport(result, 'Exported promotion codes are required');
}

export async function backendPromotionUserCouponsList(
  params?: PromotionListQuery<PromotionUserCouponsListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.userCoupons.list(
    withPromotionStatusQuery<PromotionUserCouponsListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion user coupon records are required');
}

/**
 * 作废钱包券的结果（`userCoupons.voids.create`，权限 `commerce.marketing.manage`）。
 * 后端只会作废 `claimed` / `active` / `pending` 的券；已核销的券必须走退款流程，
 * 不能用作废来"止损"。
 */
export interface PromotionUserCouponVoidResult {
  /** 被作废的钱包券 id（int64 十进制字符串）。 */
  userCouponId: string;
  /** 结果状态，恒为 `voided`。 */
  status: string;
}

/** 延长钱包券有效期的结果（`userCoupons.extensions.create`）。 */
export interface PromotionUserCouponExtensionResult {
  userCouponId: string;
  /** 服务端规范化后的新到期时间（RFC 3339 UTC 形态）。 */
  expiresAt: string;
}

/** 停用单个券码的结果（`codes.disables.create`）。 */
export interface PromotionCodeDisableResult {
  codeId: string;
  /** 结果状态，恒为 `disabled`。 */
  status: string;
}

/**
 * 停用批次内可用券码的结果（`codeBatches.disables.create`）。
 *
 * 两个计数在 wire 上是 int64 **字符串**（API_SPEC §13.6），因此保持字符串原样，
 * 绝不经过 `Number` 后再展示或比较。
 */
export interface PromotionCodeBatchDisableResult {
  /** 本次真正停用的券码数（`active` 且从未被领取）。 */
  disabledCount: string;
  /** 因已领取或不再 `active` 而被守卫跳过的券码数。 */
  skippedCount: string;
}

/**
 * 作废一张钱包券（`userCoupons.voids.create`）。
 *
 * `reason` 会由服务端按 1..256 字符校验（trim 后），并与操作人一起写入审计记录；
 * 操作人来自认证上下文，客户端无法指定。仅 `claimed` / `active` / `pending`
 * 的券可作废，已核销的券返回业务错误（退款流程）。
 */
export async function backendVoidPromotionUserCoupon(
  userCouponId: string,
  reason: string,
): Promise<PromotionUserCouponVoidResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.userCoupons.voids.create(
    userCouponId,
    { reason },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Voided user coupon is required');
  return {
    userCouponId: readRequiredString(item, 'userCouponId', 'Voided user coupon id is required'),
    status: readRequiredString(item, 'status', 'Voided user coupon status is required'),
  };
}

/**
 * 延长一张钱包券的有效期（`userCoupons.extensions.create`）。
 *
 * `expiresAt` 必须是 RFC 3339（由 `toIsoString` 从 `datetime-local` 输入转换）。
 * 后端用数据库时钟校验，过去的时间返回 400；同样只允许
 * `claimed` / `active` / `pending` 的券。
 */
export async function backendExtendPromotionUserCoupon(
  userCouponId: string,
  expiresAt: string,
): Promise<PromotionUserCouponExtensionResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.userCoupons.extensions.create(
    userCouponId,
    { expiresAt },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Extended user coupon is required');
  return {
    userCouponId: readRequiredString(item, 'userCouponId', 'Extended user coupon id is required'),
    expiresAt: readRequiredString(item, 'expiresAt', 'Extended user coupon expiry is required'),
  };
}

/**
 * 停用一个券码（`codes.disables.create`）。
 *
 * 守卫：券码必须 `active` 且 `claimed_quantity = 0`；已领取或非 active 的券码
 * 会被后端拒绝（不是"部分成功"）。`reason` 与操作人写入审计记录。
 */
export async function backendDisablePromotionCode(
  codeId: string,
  reason: string,
): Promise<PromotionCodeDisableResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.disables.create(
    codeId,
    { reason },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Disabled promotion code is required');
  return {
    codeId: readRequiredString(item, 'codeId', 'Disabled promotion code id is required'),
    status: readRequiredString(item, 'status', 'Disabled promotion code status is required'),
  };
}

/**
 * 补发单个券码的结果（`codes.reissues.create`，权限 `commerce.marketing.manage`）。
 *
 * **只有脱敏展示字段**：`codeId` 是**新**券码的 id（`replacedCodeId` 才是旧 id），
 * 完整可兑换新码不在该响应里——必须通过受审计的揭示（`codes.reveals.create`）
 * 或批次导出读取。UI 因此只能展示 `codeNo` / `codeMasked` / `codeLast4`。
 */
export interface PromotionCodeReissueResult {
  /** 新券码 id（int64 十进制字符串）。 */
  codeId: string;
  /** 新券码的人类可读编号（`promotion_code.code_no`）。 */
  codeNo: string;
  /** 新券码的展示脱敏值；不等于可兑换券码。 */
  codeMasked: string;
  /** 新券码末四位。 */
  codeLast4: string;
  /** 被停用的原券码 id。 */
  replacedCodeId: string;
}

/**
 * 补发一个未使用券码（`codes.reissues.create`）。
 *
 * 守卫：原券码必须 `active` 且 `claimedQuantity = 0`；已领取或非 active 返回
 * 409（服务端不做"部分成功"）。不传 `code` 时由服务端按批次的
 * `codePrefix` / `codeLength` 生成新码；显式传入的 `code` 由服务端 trim 后转
 * 大写并按 4–64 位 `A-Z0-9-_` 校验，租户内冲突返回 409。
 *
 * 旧码停用、新码插入与审计证据在服务端同一事务中完成；客户端拿不到完整新码。
 */
export async function backendReissuePromotionCode(
  codeId: string,
  reason: string,
  code?: string,
): Promise<PromotionCodeReissueResult> {
  const explicitCode = code?.trim();
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codes.reissues.create(
    codeId,
    explicitCode ? { reason, code: explicitCode } : { reason },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Reissued promotion code is required');
  return {
    codeId: readRequiredString(item, 'codeId', 'Reissued promotion code id is required'),
    codeNo: readRequiredString(item, 'codeNo', 'Reissued promotion code number is required'),
    codeMasked: readRequiredString(item, 'codeMasked', 'Reissued promotion code masked value is required'),
    codeLast4: readRequiredString(item, 'codeLast4', 'Reissued promotion code last four characters are required'),
    replacedCodeId: readRequiredString(item, 'replacedCodeId', 'Replaced promotion code id is required'),
  };
}

/**
 * 停用批次内所有"可用"券码（`codeBatches.disables.create`）。
 *
 * 返回的是**批量结果**：`disabledCount` 是真正停用的数量，`skippedCount` 是
 * 因已领取或不再 active 被守卫跳过的数量。已领取的券码不会被作废——它们继续
 * 可核销，这正是止损操作需要如实告知运营的部分。
 */
export async function backendDisablePromotionBatchCodes(
  batchId: string,
  reason: string,
): Promise<PromotionCodeBatchDisableResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.codeBatches.disables.create(
    batchId,
    { reason },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Disabled promotion batch codes are required');
  return {
    disabledCount: readRequiredNonNegativeInt64String(
      item,
      'disabledCount',
      'Disabled promotion batch code count is required',
    ),
    skippedCount: readRequiredNonNegativeInt64String(
      item,
      'skippedCount',
      'Skipped promotion batch code count is required',
    ),
  };
}

export async function backendPromotionDiscountApplicationsList(
  params?: PromotionDiscountApplicationsListQuery,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.discountApplications.list(
    withPromotionStatusQuery<PromotionDiscountApplicationsListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion discount application records are required');
}

/**
 * 结算一条抵扣申请（`discountApplications.settlements.create`）。
 *
 * 只有 `applied` 的申请可以结算，其余状态后端返回 409。没有请求体；
 * `settledAmountMinor` 是从预留池转入已用金额的最小单位（int64 十进制字符串），
 * 该申请从未预留预算时为 `0`。
 */
export interface PromotionDiscountApplicationSettlementResult {
  applicationId: string;
  /** 结果状态，恒为 `settled`。 */
  status: string;
  settledAmountMinor: string;
}

/**
 * 释放一条抵扣申请（`discountApplications.releases.create`）。
 *
 * 只有 `applied` 的申请可以释放，其余状态后端返回 409。`reason` 由服务端按
 * trim 后 1..256 字符校验，并与操作人一起写入审计记录。
 */
export interface PromotionDiscountApplicationReleaseResult {
  applicationId: string;
  /** 结果状态，恒为 `released`。 */
  status: string;
  releasedAmountMinor: string;
}

/**
 * 结算抵扣申请：预留金额转入已用金额，申请进入 `settled`。
 * 最小单位金额保持十进制字符串，绝不经过 `Number`（API_SPEC §13.6）。
 */
export async function backendSettlePromotionDiscountApplication(
  applicationId: string,
): Promise<PromotionDiscountApplicationSettlementResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.discountApplications.settlements.create(
    applicationId,
  );
  const item = readRequiredItem<ApiRecord>(result, 'Settled discount application is required');
  return {
    applicationId: readRequiredString(item, 'applicationId', 'Settled discount application id is required'),
    status: readRequiredString(item, 'status', 'Settled discount application status is required'),
    settledAmountMinor: readRequiredNonNegativeInt64String(
      item,
      'settledAmountMinor',
      'Settled discount application amount is required',
    ),
  };
}

/**
 * 释放抵扣申请：预留金额回到可用池，申请进入 `released`。
 * `reason` 会按 trim 后 1..256 字符由服务端再校验一次。
 */
export async function backendReleasePromotionDiscountApplication(
  applicationId: string,
  reason: string,
): Promise<PromotionDiscountApplicationReleaseResult> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.discountApplications.releases.create(
    applicationId,
    { reason },
  );
  const item = readRequiredItem<ApiRecord>(result, 'Released discount application is required');
  return {
    applicationId: readRequiredString(item, 'applicationId', 'Released discount application id is required'),
    status: readRequiredString(item, 'status', 'Released discount application status is required'),
    releasedAmountMinor: readRequiredNonNegativeInt64String(
      item,
      'releasedAmountMinor',
      'Released discount application amount is required',
    ),
  };
}

export async function backendPromotionCouponLedgerEntriesList(
  params?: PromotionListQuery<PromotionCouponLedgerEntriesListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.couponLedgerEntries.list(
    withPromotionStatusQuery<PromotionCouponLedgerEntriesListParams>(params),
  );
  return readRequiredPromotionPage(result, 'Promotion coupon ledger records are required');
}

/**
 * 兑换尝试台账（`redemptionAttempts.list`）：追加式证据，包含成功与失败；
 * 提交的完整券码从不入库也不返回，只有后缀。`outcome` 原样进入 query。
 */
export async function backendRedemptionAttemptsList(
  params?: PromotionRedemptionAttemptsListQuery,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.redemptionAttempts.list(params);
  return readRequiredPromotionPage(result, 'Promotion redemption attempt records are required');
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
  params?: PromotionListQuery<PromotionDistributionTasksListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.distributionTasks.list(
    withPromotionStatusQuery<PromotionDistributionTasksListParams>(params),
  );
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

/**
 * 运营报表的查询窗口：`from`/`to` 是 RFC 3339（页面的 `datetime-local` 经
 * `toIsoString` 转换）。两个字段都可省略，服务端按最近 30 天处理。
 */
export interface PromotionReportWindow {
  from?: string;
  to?: string;
}

type BackendPromotionReportsService =
  ReturnType<typeof getSdkworkPromotionBackendSdkClient>['promotions']['promotionReports'];

/**
 * 生成 SDK `promotionReports.retrieve` 的返回类型（`data.item` 已由 SDK 解包）。
 *
 * 直接从 SDK 方法签名派生，而不是在营销包里复制一份报表 DTO：生成包里的
 * `PromotionReport` / `PromotionReportCounts` / `PromotionReportRates` /
 * `PromotionReportCurrencyTotal` / `PromotionReportTopOffer` 字段名与可空性
 * 变化时会立刻反映到这里，避免本地副本与后端契约悄悄漂移。
 */
export type PromotionReport = Awaited<ReturnType<BackendPromotionReportsService['retrieve']>>;

/**
 * 读取优惠券经营报表（`promotionReports.retrieve`，权限
 * `commerce.marketing.read`）。
 *
 * 生成 SDK 把 `from` 查询参数声明为 `from_`（`from` 是保留字），wire 上仍是
 * `from` / `to`；这里是本模块唯一的参数形态转换，调用方始终使用 RFC 3339 的
 * `from`/`to`。`from > to` 时服务端返回 400，错误原样抛出，由页面展示
 * `ProblemDetail` 文案与可复制的 `traceId`。
 *
 * 计数与金额在 wire 上都是 int64 十进制字符串，横跨页面时保持字符串，
 * 绝不经过 `Number`（API_SPEC §13.6）。
 */
export async function backendPromotionReport(
  window: PromotionReportWindow = {},
): Promise<PromotionReport> {
  const query: { from_?: string; to?: string } = {};
  if (window.from) {
    query.from_ = window.from;
  }
  if (window.to) {
    query.to = window.to;
  }
  const report = await getSdkworkPromotionBackendSdkClient().promotions.promotionReports.retrieve(query);
  if (!isRecord(report)) {
    throw new Error('Promotion report is required');
  }
  return report;
}

export async function retrievePromotionOffer(offerId: string): Promise<SdkworkPromotionOffer> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.retrieve(offerId);
  return readRequiredItem<SdkworkPromotionOffer>(result, 'Promotion offer is required');
}

/**
 * 编辑优惠券（`offers.update`，PATCH）：请求体与创建相同，另带**必填**乐观锁
 * `version`（int64 十进制字符串）。`version` 必须原样透传检索结果，不能经过
 * `Number`：超过 2^53 的 int64 会被静默舍入，导致把过期版本提交回去。
 *
 * 后端会写入新的不可变 `offer_version` 并重指向 `current_offer_version_id`；
 * 已发放的库存/券码仍绑定创建时的版本，因此编辑不改变既有券码的核销方式。
 */
export async function updatePromotionOffer(
  offerId: string,
  input: SdkworkPromotionOfferRequest,
): Promise<SdkworkPromotionOffer> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.offers.update(offerId, input);
  return readRequiredItem<SdkworkPromotionOffer>(result, 'Updated promotion offer is required');
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

/**
 * 订单抵扣方式（后端闭集，存储为大写）。
 *
 * - `NONE`：仅发放权益，不产生订单折扣（存量优惠券的默认形态）；
 * - `FIXED`：订单减免固定金额；
 * - `PERCENTAGE`：按订单金额的百分比减免，`discountValue` 是百分数（`12.5` = 12.5%）。
 */
export type CouponDiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

/** 可编辑的满减/折扣字段。 */
export type CouponDiscountField = 'discountValue' | 'minimumAmount' | 'maximumDiscountAmount';

/**
 * 客户端校验失败码；与后端 `validate_discount_terms` 的拒绝条件一一对应，
 * 由表单映射成 i18n 文案贴在字段下方。
 */
export type CouponDiscountValidationCode =
  | 'fixedDiscountRequired'
  | 'percentageOutOfRange'
  | 'decimalInvalid'
  | 'minimumAmountInvalid'
  | 'maximumDiscountNotAllowed'
  | 'maximumDiscountInvalid';

export interface CouponDiscountValidationIssue {
  field: CouponDiscountField;
  code: CouponDiscountValidationCode;
}

/** 规范化后的满减/折扣条款（wire 形态）。 */
export interface CouponDiscountTerms {
  discountType: CouponDiscountType;
  /** `NONE` 恒为 `'0'`；`FIXED` 为金额，`PERCENTAGE` 为百分数。 */
  discountValue: string;
  /** 空白按 `'0'` 提交（无最低订单金额）。 */
  minimumAmount: string;
  /** 仅 `PERCENTAGE` 允许；其余方式恒为 `null`。 */
  maximumDiscountAmount: string | null;
}

/**
 * 校验/构建满减条款的输入。`discountType` 保持宽松的 `string`：wire 上大小写
 * 不敏感，历史数据也可能带旧拼写；函数内部统一归一化后再判断。
 */
export interface CouponDiscountTermsInput {
  discountType?: string | null;
  discountValue?: string;
  minimumAmount?: string;
  maximumDiscountAmount?: string | null;
}

/** 十进制主单位金额/百分数：非负、最多两位小数，禁止符号、指数与千分位。 */
const COUPON_DISCOUNT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/u;
/** `100.00` 的百分数最小单位值（两位小数），用于不经过浮点比较上限。 */
const COUPON_PERCENTAGE_MAX_HUNDREDTHS = 10_000n;

export interface CouponOfferCreateFormValues {
  /**
   * 编辑模式的乐观锁版本（int64 十进制字符串，来自 `offer.version`）。
   * 创建/复制时省略；编辑提交时由表单从 `initialVersion` 原样带入，绝不转 number。
   */
  version?: string;
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
  /** Compute Credits coupon: whole Compute Credits to grant; cash coupon: amount in major units (converted to minor units on submit). */
  grantAmount?: string;
  /** Compute Credits coupon: optional whole bonus Compute Credits. */
  bonusAmount?: string;
  /** Membership points coupon: whole membership points to grant. */
  grantPoints?: string;
  /** Cash / Compute Credits coupon currency (cash coupons are entered in major units). */
  currencyCode: string;
  /**
   * 订单抵扣条款：`NONE`（仅权益）/ `FIXED`（满减）/ `PERCENTAGE`（折扣）。
   * 缺省按 `NONE` 处理，保证存量“只发权益”的优惠券行为不变。
   */
  discountType?: CouponDiscountType;
  /** `FIXED`：元金额（> 0）；`PERCENTAGE`：百分数（0, 100]；`NONE`：忽略并提交 `0`。 */
  discountValue?: string;
  /** 最低订单金额（元，≥ 0）；留空提交 `0`。 */
  minimumAmount?: string;
  /** 百分比折扣封顶金额（元，> 0）；仅 `PERCENTAGE` 可用。 */
  maximumDiscountAmount?: string | null;
  period?: 'day' | 'week' | 'month' | 'year';
  durationDays?: string;
  dailyQuota?: string;
  totalQuota?: string;
  /** 订阅券绑定的会员产品 ID；与 skuId、packageId 必须同时填写或同时留空。 */
  productId?: string;
  /** 订阅券绑定的会员 SKU ID；与 productId、packageId 必须同时填写或同时留空。 */
  skuId?: string;
  /** 订阅券绑定的会员套餐 ID（正整数字符串）；与 productId、skuId 必须同时填写或同时留空。 */
  packageId?: string;
  stockType: CouponStockType;
  codeIssueMode: CouponCodeIssueMode;
  /**
   * 库存预算上限（元，可选）：留空表示不设上限（不发送 `budgetAmountMinor`）。
   * 填写时必须是大于 0 的金额，提交时经 `yuanToMinorUnits` 换算成最小单位，
   * 不经过浮点乘 100。该上限在抵扣申请（预留 → 结算/释放）阶段生效，
   * 且只影响现金类抵扣。
   */
  budgetAmount?: string;
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

/**
 * 抵扣方式归一化：大小写不敏感（后端同样按大写存储），兼容历史 `PERCENT`
 * 拼写；未知/缺失值一律视为 `NONE`，绝不把存量优惠券误判成满减。
 */
export function normalizeCouponDiscountType(value: unknown): CouponDiscountType {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'FIXED') {
    return 'FIXED';
  }
  if (normalized === 'PERCENTAGE' || normalized === 'PERCENT') {
    return 'PERCENTAGE';
  }
  return 'NONE';
}

/**
 * 十进制主单位字面量归一化：去首尾空白、去掉一个前导 `+`，其余必须严格匹配
 * `^\d+(\.\d{1,2})?$`。返回 `null` 表示不可接受（负号、指数、千分位逗号、
 * 三位以上小数等），绝不静默取整。
 */
export function normalizeCouponDiscountDecimal(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  const unsigned = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  if (!COUPON_DISCOUNT_DECIMAL_PATTERN.test(unsigned)) {
    return null;
  }
  const [integer, fraction] = unsigned.split('.');
  // 去掉多余前导零（`007` → `7`，`0` 保持不变），得到稳定的 wire 形态。
  const whole = integer.replace(/^0+(?=\d)/u, '') || '0';
  return fraction === undefined ? whole : `${whole}.${fraction}`;
}

/** 十进制字面量 → 百分之一单位（`BigInt`，不经过浮点）。 */
function couponDiscountHundredths(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

/** 读取可选字段文本：空值/空白返回空串，其余字符串化并去空白。 */
function readCouponDiscountText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * 校验满减/折扣条款（镜像后端 `validate_discount_terms`）。
 *
 * 返回**全部**字段级问题，便于表单在每个字段下方同时展示；空数组表示可提交。
 * 金额/百分数的格式统一由 `normalizeCouponDiscountDecimal` 判定，因此负号、
 * 逗号、指数与三位小数都会落到 `decimalInvalid` / `minimumAmountInvalid`。
 */
export function validateCouponDiscountTerms(
  values: CouponDiscountTermsInput,
): CouponDiscountValidationIssue[] {
  const issues: CouponDiscountValidationIssue[] = [];
  const discountType = normalizeCouponDiscountType(values.discountType);
  const discountValueRaw = values.discountValue ?? '';
  if (discountType === 'NONE') {
    // `NONE` 的金额字段不可编辑，提交时统一为 `0`，因此只校验残留的封顶金额。
    const maximumRaw = readCouponDiscountText(values.maximumDiscountAmount);
    if (maximumRaw) {
      issues.push({ field: 'maximumDiscountAmount', code: 'maximumDiscountNotAllowed' });
    }
    return issues;
  }

  const discountValue = normalizeCouponDiscountDecimal(discountValueRaw);
  if (discountValue === null) {
    const code: CouponDiscountValidationCode = discountValueRaw.trim() === ''
      ? (discountType === 'FIXED' ? 'fixedDiscountRequired' : 'percentageOutOfRange')
      : 'decimalInvalid';
    issues.push({ field: 'discountValue', code });
  } else {
    const hundredths = couponDiscountHundredths(discountValue);
    if (discountType === 'FIXED' && hundredths === 0n) {
      issues.push({ field: 'discountValue', code: 'fixedDiscountRequired' });
    }
    if (discountType === 'PERCENTAGE' && (hundredths === 0n || hundredths > COUPON_PERCENTAGE_MAX_HUNDREDTHS)) {
      issues.push({ field: 'discountValue', code: 'percentageOutOfRange' });
    }
  }

  const minimumRaw = readCouponDiscountText(values.minimumAmount);
  if (minimumRaw && normalizeCouponDiscountDecimal(minimumRaw) === null) {
    issues.push({ field: 'minimumAmount', code: 'minimumAmountInvalid' });
  }

  const maximumRaw = readCouponDiscountText(values.maximumDiscountAmount);
  if (maximumRaw) {
    if (discountType !== 'PERCENTAGE') {
      issues.push({ field: 'maximumDiscountAmount', code: 'maximumDiscountNotAllowed' });
    } else {
      const maximum = normalizeCouponDiscountDecimal(maximumRaw);
      if (maximum === null || couponDiscountHundredths(maximum) === 0n) {
        issues.push({ field: 'maximumDiscountAmount', code: 'maximumDiscountInvalid' });
      }
    }
  }

  return issues;
}

function requireCouponDiscountDecimal(name: string, value: string | null | undefined): string {
  const normalized = normalizeCouponDiscountDecimal(value);
  if (normalized === null) {
    throw new Error(`${name} must be a plain non-negative decimal with at most 2 fraction digits`);
  }
  return normalized;
}

/**
 * 把表单值规范化成 wire 条款。
 *
 * - `NONE`：`discountValue`/`minimumAmount` 固定 `'0'`，`maximumDiscountAmount` 为 `null`；
 * - `FIXED`：金额必须大于 0；封顶金额被丢弃（后端只允许 `PERCENTAGE`）；
 * - `PERCENTAGE`：百分数必须在 `(0, 100]`，可选的封顶金额必须大于 0。
 *
 * 非法输入直接抛错：表单已先行拦截，构建器作为最后一道防线，绝不把后端
 * 会拒绝的载荷发出去。
 */
export function buildCouponDiscountTerms(
  values: CouponDiscountTermsInput,
): CouponDiscountTerms {
  const discountType = normalizeCouponDiscountType(values.discountType);
  if (discountType === 'NONE') {
    return {
      discountType,
      discountValue: '0',
      minimumAmount: '0',
      maximumDiscountAmount: null,
    };
  }

  const discountValue = requireCouponDiscountDecimal('discountValue', values.discountValue);
  const hundredths = couponDiscountHundredths(discountValue);
  if (discountType === 'FIXED' && hundredths === 0n) {
    throw new Error('discountValue must be greater than 0 for a FIXED discount');
  }
  if (discountType === 'PERCENTAGE' && (hundredths === 0n || hundredths > COUPON_PERCENTAGE_MAX_HUNDREDTHS)) {
    throw new Error('discountValue must be greater than 0 and at most 100 for a PERCENTAGE discount');
  }

  const minimumRaw = readCouponDiscountText(values.minimumAmount);
  const minimumAmount = minimumRaw
    ? requireCouponDiscountDecimal('minimumAmount', values.minimumAmount)
    : '0';

  let maximumDiscountAmount: string | null = null;
  if (discountType === 'PERCENTAGE') {
    const maximumRaw = readCouponDiscountText(values.maximumDiscountAmount);
    if (maximumRaw) {
      const maximum = requireCouponDiscountDecimal('maximumDiscountAmount', maximumRaw);
      if (couponDiscountHundredths(maximum) === 0n) {
        throw new Error('maximumDiscountAmount must be greater than 0');
      }
      maximumDiscountAmount = maximum;
    }
  }

  return { discountType, discountValue, minimumAmount, maximumDiscountAmount };
}

export function buildCouponOfferCreateRequests(
  values: CouponOfferCreateFormValues,
  idempotencyKey: string,
): CouponOfferCreateRequests {
  const offerRequest = buildCouponOfferRequestPayload(values);
  // 预算上限（元）→ 最小单位（分）；留空或 0 表示不设上限，键直接不出现，
  // 让后端保持 "没有预算账户" 的语义，而不是建一个上限为 0 的账户。
  const budgetAmountMinor = yuanToMinorUnits(values.budgetAmount);
  const hasBudgetAmount = budgetAmountMinor !== '' && budgetAmountMinor !== '0';
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
    ...(hasBudgetAmount ? { budgetAmountMinor } : {}),
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

/**
 * 构建编辑优惠券的请求体（`offers.update`）：与创建共用同一组优惠券字段，
 * 只是额外附带乐观锁 `version`。`version` 按传入的十进制字符串原样提交，
 * 绝不经过 `Number`（int64 安全，API_SPEC §13.6）。
 */
export function buildCouponOfferUpdateRequest(
  values: CouponOfferCreateFormValues,
  version: string,
): SdkworkPromotionOfferRequest {
  return {
    ...buildCouponOfferRequestPayload(values),
    version,
  };
}

/** 创建与编辑共享的优惠券主体字段；创建响应因此保持逐字段不变。 */
function buildCouponOfferRequestPayload(
  values: CouponOfferCreateFormValues,
): SdkworkPromotionOfferRequest {
  // 满减/折扣条款：缺省为 `NONE`（仅权益），金额/百分数在这里归一化成后端
  // 接受的十进制主单位形态；非法组合会抛错，绝不静默改写。
  const discountTerms = buildCouponDiscountTerms(values);
  return {
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
    discountType: discountTerms.discountType,
    discountValue: discountTerms.discountValue,
    minimumAmount: discountTerms.minimumAmount,
    maximumDiscountAmount: discountTerms.maximumDiscountAmount,
    currencyCode: values.currencyCode,
    couponBenefit: buildCouponOfferBenefit(values),
  };
}

/** 按券类型构建权益载荷：现金券金额（元）转换为最小单位（分）；算力券/会员积分券按整数原样提交。 */
export function buildCouponOfferBenefit(values: CouponOfferCreateFormValues): SdkworkPromotionCouponBenefitRequest {
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
        ...readSubscriptionCouponTarget(values),
      };
  }
}

/** 订阅券绑定的会员套餐三元组：三者必须同时存在或同时省略。 */
interface SubscriptionCouponTarget {
  productId?: string;
  skuId?: string;
  packageId?: string;
}

/**
 * 读取订阅券绑定的会员套餐（productId / skuId / packageId）。
 * 全部留空时省略三个字段；部分填写直接拒绝，避免订单侧在核销前驳回该券。
 */
function readSubscriptionCouponTarget(values: CouponOfferCreateFormValues): SubscriptionCouponTarget {
  const productId = values.productId?.trim() ?? '';
  const skuId = values.skuId?.trim() ?? '';
  const packageId = values.packageId?.trim() ?? '';
  const filled = [productId, skuId, packageId].filter((value) => value.length > 0).length;
  if (filled === 0) {
    return {};
  }
  if (filled !== 3) {
    throw new Error('Subscription coupon benefit requires productId, skuId, and packageId together');
  }
  return { productId, skuId, packageId };
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

export type CodeBatchCodeSource = 'generated' | 'custom';

export interface CodeBatchCreateFormValues {
  stockId: string;
  codeType: string;
  /** 券码来源：系统生成（前缀 + 长度）或自定义券码（逐行录入）。 */
  codeSource?: CodeBatchCodeSource;
  quantity: string;
  /** 自定义券码：已去空白、转大写；非空时提交数量取数组长度。 */
  customCodes?: string[];
  /** 每码可兑换次数：1 表示一码一用，大于 1 为共享多次码。 */
  maxClaims?: number;
  codeLength: number;
  codePrefix: string;
  startsAt?: string;
  expiresAt?: string;
}

/** 自定义券码单码规则：4–64 位 A-Z、0-9、-、_。 */
const CUSTOM_COUPON_CODE_PATTERN = /^[A-Z0-9_-]{4,64}$/u;

/**
 * 拆分管理端录入的自定义券码：按换行拆分、去首尾空白、转大写，忽略空行。
 * 录入区始终是单个字符串，只有在构建请求时才拆分为数组。
 */
export function parseCustomCouponCodes(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim().toUpperCase())
    .filter((line) => line.length > 0);
}

/** 自定义券码单码校验：4–64 位 A-Z、0-9、-、_。 */
export function isValidCustomCouponCode(code: string): boolean {
  return CUSTOM_COUPON_CODE_PATTERN.test(code);
}

/** 返回首个重复券码的下标；无重复时返回 -1。 */
export function findDuplicateCustomCouponCodeIndex(codes: string[]): number {
  const seen = new Set<string>();
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (seen.has(code)) {
      return index;
    }
    seen.add(code);
  }
  return -1;
}

export function buildCodeBatchCreateRequest(
  values: CodeBatchCreateFormValues,
  idempotencyKey: string,
): SdkworkPromotionCodeBatchRequest {
  const customCodes = values.customCodes ?? [];
  const usesCustomCodes = customCodes.length > 0;
  // 自定义券码的数量由券码行数决定；系统生成时使用表单录入的数量。
  return {
    stockId: values.stockId,
    codeType: values.codeType,
    requestedQuantity: usesCustomCodes ? String(customCodes.length) : values.quantity,
    ...(usesCustomCodes
      ? { customCodes, maxClaims: 1 }
      : { codeLength: values.codeLength, codePrefix: values.codePrefix, maxClaims: values.maxClaims ?? 1 }),
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

/** 空值统一展示 em dash（设计规范 §2.8），不使用 `-`。 */
export const MARKETING_EMPTY_VALUE = '—';

/** 无限库存（`stock_type=unlimited`）统一展示 `∞`（设计规范 §2.8）。 */
export const MARKETING_UNLIMITED_VALUE = '∞';

/** 严格整数字面量：只接受可选的 `+`/`-` 号加十进制数字，小数点一律拒绝。 */
const MARKETING_INTEGER_PATTERN = /^[+-]?\d+$/u;

function readMarketingLocale(locale: string | undefined): string {
  const trimmed = locale?.trim();
  return trimmed ? trimmed : 'en';
}

/**
 * 按 locale 给十进制整数字符串加千分位。以 BigInt 交给 `Intl.NumberFormat`，
 * 因此超过 `Number.MAX_SAFE_INTEGER` 的 int64 也不会丢精度。
 */
function formatMarketingIntegerDigits(digits: string, locale: string | undefined): string {
  try {
    return new Intl.NumberFormat(readMarketingLocale(locale)).format(BigInt(digits));
  } catch {
    return digits;
  }
}

/**
 * 最小单位金额（int64 十进制字符串）+ 币种 → 金额文案。
 *
 * 契约：入参是**最小单位**（分），必须是严格整数（`/^-?\d+$/`，允许前导 `+`）。
 * 用字符串整数运算完成 minor → major 的两位小数换算，不经过 `Number`，
 * 因此超过 2^53 的 int64 也不会丢精度。
 *
 * 回退契约：空值 → `—`；任何非整数输入（例如把 major 单位的 `"5.00"`、
 * `"5.5"`、`"abc"` 误传进来）→ **原样展示 + 币种**，并输出一行 `console.warn`。
 * 绝不静默 ÷100，也绝不把非空值显示成 `-`（防 100× 错标，设计规范 §2.8）。
 */
export function formatMarketingAmountMinor(
  value: string | undefined,
  currency: string,
  locale: string,
): string {
  const raw = value?.trim() ?? '';
  const currencyCode = currency?.trim() || 'CNY';
  if (!raw) {
    return MARKETING_EMPTY_VALUE;
  }
  if (!MARKETING_INTEGER_PATTERN.test(raw)) {
    console.warn(
      `[marketing] formatMarketingAmountMinor expected integer minor units but received "${raw}"; showing the raw value with ${currencyCode} to avoid a 100x amount error.`,
    );
    return `${raw} ${currencyCode}`;
  }
  const normalized = raw.startsWith('+') ? raw.slice(1) : raw;
  const negative = normalized.startsWith('-');
  const digits = (negative ? normalized.slice(1) : normalized).replace(/^0+(?=\d)/u, '') || '0';
  const padded = digits.padStart(3, '0');
  const whole = padded.slice(0, -2);
  const fraction = padded.slice(-2);
  return `${negative ? '-' : ''}${formatMarketingIntegerDigits(whole, locale)}.${fraction} ${currencyCode}`;
}

export interface FormatMarketingIntegerOptions {
  /** 调用方已知该数量是无限库存（`stock_type=unlimited`）时展示 `∞`。 */
  unlimited?: boolean;
  /** 千分位使用的 locale；缺省 `en`。 */
  locale?: string;
}

/**
 * 计数格式化：千分位、右对齐列可直接使用；`null`/空串/非整数文本 → `—`，
 * `unlimited` → `∞`。int64 十进制字符串以 BigInt 分组，不丢精度。
 */
export function formatMarketingInteger(
  value: string | number | null | undefined,
  options: FormatMarketingIntegerOptions = {},
): string {
  if (options.unlimited) {
    return MARKETING_UNLIMITED_VALUE;
  }
  if (value === null || value === undefined) {
    return MARKETING_EMPTY_VALUE;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      return MARKETING_EMPTY_VALUE;
    }
    return formatMarketingIntegerDigits(String(value), options.locale);
  }
  const raw = value.trim();
  if (!raw || !MARKETING_INTEGER_PATTERN.test(raw)) {
    return MARKETING_EMPTY_VALUE;
  }
  const normalized = raw.startsWith('+') ? raw.slice(1) : raw;
  const negative = normalized.startsWith('-');
  const digits = (negative ? normalized.slice(1) : normalized).replace(/^0+(?=\d)/u, '') || '0';
  return `${negative ? '-' : ''}${formatMarketingIntegerDigits(digits, options.locale)}`;
}

/**
 * 百分比格式化：一位小数 + `%`（入参已经是百分数值，如 `85.67` → `85.7%`）。
 * `null`/空串/非数字 → `—`。
 */
export function formatMarketingPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return MARKETING_EMPTY_VALUE;
  }
  const numeric = typeof value === 'number' ? value : value.trim() === '' ? Number.NaN : Number(value.trim());
  if (!Number.isFinite(numeric)) {
    return MARKETING_EMPTY_VALUE;
  }
  return `${numeric.toFixed(1)}%`;
}

/** 基点文本：报表里的 `*RateBp` 是非负 int64 十进制字符串（0..10000）。 */
const MARKETING_BASIS_POINTS_PATTERN = /^\d+$/u;

/**
 * 基点（basis points，10000 bp = 100%）→ 一位小数的百分比文案。
 *
 * 设计规范 §2.8：百分比固定一位小数。换算全程使用 `BigInt` 整数运算
 * （先换算成"十分之一个百分点"并四舍五入），不出现 `bp / 100` 的浮点漂移：
 *
 * - `3750` → `37.5%`
 * - `0` → `0.0%`（服务端在分母为 0 时直接给 0，因此这里绝不会出现
 *   `NaN` / `Infinity`）
 * - `10000` → `100.0%`
 *
 * 非整数文本、负数与空值 → `—`。
 */
export function formatMarketingRateBp(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return MARKETING_EMPTY_VALUE;
  }
  const raw = typeof value === 'number'
    ? Number.isSafeInteger(value) && value >= 0 ? String(value) : ''
    : value.trim();
  if (!MARKETING_BASIS_POINTS_PATTERN.test(raw)) {
    return MARKETING_EMPTY_VALUE;
  }
  // 十分之一个百分点 = bp / 10；`+5` 后整除 10 即四舍五入到一位小数。
  const tenths = (BigInt(raw) + 5n) / 10n;
  return `${tenths / 10n}.${tenths % 10n}%`;
}

/** RFC 3339 / 后端 `CAST` 投影 / 带 offset 的时间文本；无时分秒也接受。 */
const MARKETING_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/iu;

/**
 * 解析三种后端时间形态：
 * - RFC 3339：`2026-11-10T09:12:00.000Z`
 * - 管理端 `CAST(... AS TEXT)`：`2026-11-10 09:12:00`（无时区，按本地墙钟解析）
 * - 带 offset：`2026-11-10T09:12:00+08:00`、`2026-11-10 09:12:00+00`
 *
 * 返回 `null` 表示不可解析（调用方原样展示）。
 */
function parseMarketingTimestamp(raw: string): Date | null {
  const match = MARKETING_TIMESTAMP_PATTERN.exec(raw);
  if (!match) {
    return null;
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText ?? '0');
  const minute = Number(minuteText ?? '0');
  const second = Number(secondText ?? '0');
  const milliseconds = fraction ? Number(fraction.padEnd(3, '0').slice(0, 3)) : 0;
  // JS `Date` silently normalizes overflow (month 13, hour 99); reject it here so
  // an impossible backend value falls back to raw text instead of a wrong date.
  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return null;
  }
  const date = offset
    ? new Date(Date.UTC(year, month - 1, day, hour, minute, second, milliseconds))
    : new Date(year, month - 1, day, hour, minute, second, milliseconds);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const wallClockMatches = offset
    ? date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      date.getUTCHours() === hour
    : date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      date.getHours() === hour;
  if (!wallClockMatches) {
    return null;
  }
  if (!offset || offset.toUpperCase() === 'Z') {
    return date;
  }
  const sign = offset.startsWith('-') ? -1 : 1;
  const offsetDigits = offset.slice(1).replace(':', '');
  const offsetMinutes =
    Number(offsetDigits.slice(0, 2)) * 60 + Number(offsetDigits.slice(2, 4) || '0');
  return new Date(date.getTime() - sign * offsetMinutes * 60_000);
}

/** 本地时区 `YYYY-MM-DD HH:mm`；Intl 只负责取本地字段，输出形态固定。 */
function formatLocalMarketingDateTime(date: Date, locale: string | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat(readMarketingLocale(locale), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${read('year').padStart(4, '0')}-${read('month').padStart(2, '0')}-${read('day').padStart(2, '0')} ${read('hour').padStart(2, '0')}:${read('minute').padStart(2, '0')}`;
  } catch {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

/**
 * 时间格式化：三种后端形态统一解析后按本地时区渲染 `YYYY-MM-DD HH:mm`。
 * 不可解析的输入原样返回（绝不出现 `Invalid Date`），空值返回 `—`。
 */
export function formatMarketingTimestamp(
  value: string | null | undefined,
  locale?: string,
): string {
  if (value === null || value === undefined) {
    return MARKETING_EMPTY_VALUE;
  }
  const raw = value.trim();
  if (!raw) {
    return MARKETING_EMPTY_VALUE;
  }
  const parsed = parseMarketingTimestamp(raw);
  return parsed ? formatLocalMarketingDateTime(parsed, locale) : raw;
}

/** 悬停提示：完整原文（含秒与时区），用于 `title`。 */
export function marketingTimestampTitle(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  return raw ? raw : undefined;
}

/** 库存数量：int64 十进制字符串 + 该库存是否无限。 */
export interface PromotionStockQuantity {
  /** 原始十进制整数字符串；字段缺失或非整数文本为 `null`。 */
  raw: string | null;
  /** `stock_type=unlimited`：总量存 `0`，展示为 `∞`。 */
  unlimited: boolean;
}

/** 库存是否为无限池（`stock_type=unlimited`，总量按契约存 `0`）。 */
export function isUnlimitedPromotionStock(stock: ApiRecord): boolean {
  const stockType = String(stock['stockType'] ?? stock['stock_type'] ?? '')
    .trim()
    .toLowerCase();
  return stockType === 'unlimited';
}

/** 读取库存计数；无限池不把 `0` 当作"没有库存"。 */
export function readPromotionStockQuantity(stock: ApiRecord, key: string): PromotionStockQuantity {
  const value = stock[key];
  const raw =
    typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const valid = raw.length > 0 ? raw : null;
  return {
    raw: valid !== null && MARKETING_INTEGER_PATTERN.test(valid) ? valid : null,
    unlimited: isUnlimitedPromotionStock(stock),
  };
}

/** 库存对账行：issued(=total) / claimed / redeemed / available / locked + 漂移标记。 */
export interface PromotionStockReconciliation {
  unlimited: boolean;
  issued: PromotionStockQuantity;
  claimed: PromotionStockQuantity;
  redeemed: PromotionStockQuantity;
  available: PromotionStockQuantity;
  locked: PromotionStockQuantity;
  /** 有限库存且 `available + claimed + redeemed !== total` 时为 true。 */
  drift: boolean;
}

function readPromotionQuantityBigInt(quantity: PromotionStockQuantity): bigint | null {
  if (quantity.raw === null) {
    return null;
  }
  try {
    return BigInt(quantity.raw);
  } catch {
    return null;
  }
}

/**
 * 构建单行库存对账数据。
 *
 * 漂移口径固定为 `available + claimed + redeemed` 是否等于 `total`（`issued` 即
 * 总量投影）。无限池没有可对账的总量，`drift` 恒为 `false`；任一字段缺失时
 * 无法对账，也返回 `false`，避免把"数据没返回"误报成"账不平"。
 */
export function readPromotionStockReconciliation(stock: ApiRecord): PromotionStockReconciliation {
  const unlimited = isUnlimitedPromotionStock(stock);
  const issued = readPromotionStockQuantity(stock, 'totalQuantity');
  const claimed = readPromotionStockQuantity(stock, 'claimedQuantity');
  const redeemed = readPromotionStockQuantity(stock, 'redeemedQuantity');
  const available = readPromotionStockQuantity(stock, 'availableQuantity');
  const locked = readPromotionStockQuantity(stock, 'lockedQuantity');
  const total = readPromotionQuantityBigInt(issued);
  const availableValue = readPromotionQuantityBigInt(available);
  const claimedValue = readPromotionQuantityBigInt(claimed);
  const redeemedValue = readPromotionQuantityBigInt(redeemed);
  const drift =
    !unlimited &&
    total !== null &&
    availableValue !== null &&
    claimedValue !== null &&
    redeemedValue !== null &&
    total !== availableValue + claimedValue + redeemedValue;
  return { unlimited, issued, claimed, redeemed, available, locked, drift };
}

/**
 * 单笔库存预算（最小单位 = 分）。四个字段在库存没有预算账户时都是 `null`，
 * 页面据此**不渲染**预算块，而不是显示 `0`。
 */
export interface PromotionStockBudget {
  /** 预算上限（`budgetAmountMinor`）。 */
  total: string | null;
  /** 仍可预留的预算（`budgetAvailableMinor`）。 */
  available: string | null;
  /** 被在途抵扣申请占用的预算（`budgetReservedMinor`）。 */
  reserved: string | null;
  /** 已结算消耗的预算（`budgetUsedMinor`）。 */
  used: string | null;
  /**
   * `used + reserved > total`：数据库约束下不应出现，属于防御性错误态；
   * 页面必须给出错误提示，而不是画一根越界的进度条。
   */
  overCommitted: boolean;
  /** 预算使用率（`used / total`，一位小数的百分数值）；无可用总额时为 `null`。 */
  usedPercent: number | null;
}

/** 预算字段：只接受非负十进制整数字符串，其余（空值/小数/负数/文本）一律 `null`。 */
function readPromotionBudgetMinor(stock: ApiRecord, camelKey: string, snakeKey: string): string | null {
  const value = stock[camelKey] ?? stock[snakeKey];
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (!raw || !/^\d+$/u.test(raw)) {
    return null;
  }
  return raw.replace(/^0+(?=\d)/u, '') || '0';
}

function readPromotionBudgetBigInt(value: string | null): bigint | null {
  if (value === null) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * 读取库存预算。
 *
 * 四个金额都是 int64 最小单位十进制字符串（API_SPEC §13.6），这里以 BigInt
 * 做 `used + reserved > total` 与使用率运算，超过 2^53 也不会丢精度。
 * 四个字段全部缺失/为空 → 返回 `null`（库存没有预算账户，页面不渲染任何预算 UI）。
 */
export function readPromotionStockBudget(stock: ApiRecord): PromotionStockBudget | null {
  const total = readPromotionBudgetMinor(stock, 'budgetAmountMinor', 'budget_amount_minor');
  const available = readPromotionBudgetMinor(stock, 'budgetAvailableMinor', 'budget_available_minor');
  const reserved = readPromotionBudgetMinor(stock, 'budgetReservedMinor', 'budget_reserved_minor');
  const used = readPromotionBudgetMinor(stock, 'budgetUsedMinor', 'budget_used_minor');
  if (total === null && available === null && reserved === null && used === null) {
    return null;
  }
  const totalValue = readPromotionBudgetBigInt(total);
  const reservedValue = readPromotionBudgetBigInt(reserved);
  const usedValue = readPromotionBudgetBigInt(used);
  const overCommitted =
    totalValue !== null &&
    totalValue > 0n &&
    reservedValue !== null &&
    usedValue !== null &&
    usedValue + reservedValue > totalValue;
  const usedPercent =
    totalValue !== null && totalValue > 0n && usedValue !== null
      // 先放大 10 倍取整再除 10，得到一位小数；进度条与文案使用同一个值。
      ? Math.min(100, Number((usedValue * 1000n) / totalValue) / 10)
      : null;
  return { total, available, reserved, used, overCommitted, usedPercent };
}

/**
 * 从 SDK 错误对象上提取可复制的 `traceId`（`ProblemDetail.traceId`）；
 * 兼容 `trace_id` 与挂在错误根上的历史形态，取不到返回 `null`。
 */
export function readMarketingProblemTraceId(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }
  const candidates: unknown[] = [error['traceId'], error['trace_id']];
  const problem = error['problem'];
  if (isRecord(problem)) {
    candidates.push(problem['traceId'], problem['trace_id']);
  }
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * 读取后端错误的 HTTP 状态码（`SdkError.httpStatus` 优先，兼容
 * `ProblemDetail.status`、错误对象 `status` 与 SDK 错误类 code）。
 *
 * 页面用它区分可恢复的乐观锁冲突（409）、资源已被删除（404）与其他失败，
 * 而不是把所有失败都渲染成同一条不透明错误。
 */
export function readMarketingProblemStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }
  const problem = isRecord(error['problem']) ? error['problem'] : null;
  const candidates: unknown[] = [
    error['httpStatus'],
    error['statusCode'],
    error['status'],
    problem?.['status'],
  ];
  for (const candidate of candidates) {
    const status = typeof candidate === 'number'
      ? candidate
      : typeof candidate === 'string' && /^\d{3}$/u.test(candidate.trim())
        ? Number(candidate.trim())
        : Number.NaN;
    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return status;
    }
  }
  const code = error['code'];
  if (code === 'CONFLICT') {
    return 409;
  }
  if (code === 'NOT_FOUND') {
    return 404;
  }
  return null;
}

/** 从 offer 记录中读取结构化的券权益信息（用于列表与详情展示）。 */
export interface CouponBenefitDisplay {
  kind: CouponOfferBenefitKind;
  /** Compute Credits coupon: whole Compute Credits; cash coupon: minor-unit amount. */
  grantAmount?: string;
  /** Compute Credits coupon: whole bonus Compute Credits. */
  bonusAmount?: string;
  /** Membership points coupon: whole membership points. */
  grantPoints?: string;
  period?: string;
  durationDays?: string;
  dailyQuota?: string;
  totalQuota?: string;
  /** 订阅券绑定的会员产品 ID。 */
  productId?: string;
  /** 订阅券绑定的会员 SKU ID。 */
  skuId?: string;
  /** 订阅券绑定的会员套餐 ID。 */
  packageId?: string;
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
    productId: benefit['productId'] ? String(benefit['productId']) : undefined,
    skuId: benefit['skuId'] ? String(benefit['skuId']) : undefined,
    packageId: benefit['packageId'] ? String(benefit['packageId']) : undefined,
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

/**
 * 从 offer 记录读取满减/折扣条款并归一化成表单值（复制与编辑共用）。
 *
 * 编辑必须原样回填后端的四个字段，否则一次编辑会把运营已配置的满减/折扣
 * 重置成“仅权益”。缺失/空值回落为 `NONE` + 零值。
 */
function readCouponDiscountFormValues(
  record: ApiRecord,
): Pick<CouponOfferCreateFormValues, 'discountType' | 'discountValue' | 'minimumAmount' | 'maximumDiscountAmount'> {
  return {
    discountType: normalizeCouponDiscountType(record['discountType'] ?? record['discount_type']),
    discountValue: readOptionalRecordText(record['discountValue'] ?? record['discount_value']) ?? '0',
    minimumAmount: readOptionalRecordText(record['minimumAmount'] ?? record['minimum_amount']) ?? '0',
    maximumDiscountAmount: readOptionalRecordText(record['maximumDiscountAmount'] ?? record['maximum_discount_amount']),
  };
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
    productId: benefitKind === 'subscription' && benefit ? benefit.productId ?? '' : '',
    skuId: benefitKind === 'subscription' && benefit ? benefit.skuId ?? '' : '',
    packageId: benefitKind === 'subscription' && benefit ? benefit.packageId ?? '' : '',
    ...readCouponDiscountFormValues(record),
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '',
    perUserLimit: 1,
    claimStartsAt: '',
    claimEndsAt: '',
  };
}

/**
 * 读取优惠券乐观锁版本：后端按 int64 十进制字符串返回，这里只做字符串读取，
 * 绝不转成 `number`（2^53 以上会被静默舍入，提交回去即变成过期版本）。
 */
export function readPromotionOfferVersion(record: ApiRecord): string {
  const value = record['version'];
  return value === null || value === undefined ? '' : String(value).trim();
}

/** 读取可选文本字段：空值/空白返回 `undefined`，其余原样字符串化。 */
function readOptionalRecordText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

/**
 * 后端优惠券记录 → 编辑表单初始值。
 *
 * 与复制共用同一套字段映射，但**不追加**“（复制）”后缀；满减/折扣条款
 * （`discountType`/`discountValue`/`minimumAmount`/`maximumDiscountAmount`）
 * 由 `readCouponDiscountFormValues` 原样回填，避免编辑保存时把它们重置为
 * “仅权益”。
 */
export function offerRecordToEditFormValues(record: ApiRecord): CouponOfferCreateFormValues {
  return offerRecordToFormValues(record, '');
}

/** 详情抽屉展示用的满减/折扣条款；`NONE` 或缺失时返回 `null`（不额外渲染）。 */
export interface CouponDiscountTermsDisplay {
  discountType: Exclude<CouponDiscountType, 'NONE'>;
  /** 原始十进制文本；非金额类展示时由调用方格式化。 */
  discountValue: string | null;
  minimumAmount: string | null;
  maximumDiscountAmount: string | null;
}

export function readCouponDiscountTerms(record: ApiRecord): CouponDiscountTermsDisplay | null {
  const discountType = normalizeCouponDiscountType(record['discountType'] ?? record['discount_type']);
  if (discountType === 'NONE') {
    return null;
  }
  return {
    discountType,
    discountValue: readOptionalRecordText(record['discountValue'] ?? record['discount_value']) ?? null,
    minimumAmount: readOptionalRecordText(record['minimumAmount'] ?? record['minimum_amount']) ?? null,
    maximumDiscountAmount: readOptionalRecordText(
      record['maximumDiscountAmount'] ?? record['maximum_discount_amount'],
    ) ?? null,
  };
}

export function toIsoString(datetimeLocal: string): string {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date time value');
  }
  return date.toISOString();
}

/** Generate an idempotency key via `@sdkwork/utils/id`. */
export function createIdempotencyKey(): string {
  return uuid();
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

/** 校验审计揭示结果：`codeNo` 与完整 `code` 必须同时存在。 */
function readRequiredCodeReveal(result: unknown, message: string): PromotionCodeReveal {
  const payload = readApiData(result);
  const item = readRequiredRecord(payload, `${message}: item is required`);
  return {
    codeNo: readRequiredString(item, 'codeNo', `${message}: codeNo is required`),
    code: readRequiredString(item, 'code', `${message}: code is required`),
  };
}

/**
 * 校验审计导出结果：`items` 必须是数组，`count` 为非负整数，
 * `truncated` 缺省按 false 处理（缺失时不误报截断）。
 */
function readRequiredCodeExport(result: unknown, message: string): PromotionCodeExport {
  const payload = readApiData(result);
  const item = readRequiredRecord(payload, `${message}: item is required`);
  const items = item['items'];
  if (!Array.isArray(items)) {
    throw new Error(`${message}: items are required`);
  }
  return {
    items: items.map((value) => readRequiredCodeReveal(value, message)),
    count: readRequiredNonNegativeNumber(item, 'count', `${message}: count is required`),
    truncated: readBoolean(item, 'truncated'),
  };
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
  params?: PromotionListQuery<PromotionCampaignsListParams>,
): Promise<PromotionPage> {
  const result = await getSdkworkPromotionBackendSdkClient().promotions.campaigns.list(
    withPromotionStatusQuery<PromotionCampaignsListParams>(params),
  );
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
