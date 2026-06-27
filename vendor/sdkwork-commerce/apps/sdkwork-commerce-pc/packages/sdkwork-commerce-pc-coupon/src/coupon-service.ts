import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  normalizeSdkworkRemoteCoupon,
  normalizeSdkworkRemoteUserCoupon,
  sortSdkworkCouponCatalog,
  sortSdkworkUserCoupons,
  summarizeSdkworkCouponCatalog,
  summarizeSdkworkUserCoupons,
  type SdkworkCouponCatalog,
  type SdkworkRemoteCouponLike,
  type SdkworkRemoteUserCouponLike,
  type SdkworkUserCoupon,
  type SdkworkUserCouponDigest,
  type SdkworkCouponCatalogDigest,
} from "./coupon";
import {
  createSdkworkCouponMessages,
  type SdkworkCouponMessagesOverrides,
} from "./coupon-copy";

export interface SdkworkCouponStatistics {
  expiredCount: number;
  totalCoupons: number;
  unusedCount: number;
  usedCount: number;
}

export interface SdkworkCouponDashboardData {
  availableCoupons: SdkworkUserCoupon[];
  catalogCoupons: SdkworkCouponCatalog[];
  catalogDigest: SdkworkCouponCatalogDigest;
  myCoupons: SdkworkUserCoupon[];
  statistics: SdkworkCouponStatistics;
  userDigest: SdkworkUserCouponDigest;
}

export interface SdkworkCouponRedeemInput {
  channel?: string;
  redeemCode: string;
}

export interface SdkworkCouponPointsExchangeInput {
  couponId: string;
  requestNo?: string;
}

export interface SdkworkCouponRollbackInput {
  reason?: string;
  userCouponId: string;
}

export interface SdkworkCouponUseInput {
  orderId: string;
  userCouponId: string;
}

export interface CreateSdkworkCouponServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkCouponMessagesOverrides;
  pageSize?: number;
}

export interface SdkworkCouponService {
  cancelUseCoupon(userCouponId: string): Promise<SdkworkUserCoupon>;
  exchangeCouponByPoints(input: SdkworkCouponPointsExchangeInput): Promise<SdkworkUserCoupon>;
  getCouponDetail(couponId: string): Promise<SdkworkCouponCatalog>;
  getDashboard(): Promise<SdkworkCouponDashboardData>;
  getEmptyDashboard(): SdkworkCouponDashboardData;
  getUserCouponDetail(userCouponId: string): Promise<SdkworkUserCoupon>;
  receiveCoupon(couponId: string): Promise<SdkworkUserCoupon>;
  redeemCoupon(input: SdkworkCouponRedeemInput): Promise<SdkworkUserCoupon>;
  rollbackPointsExchange(input: SdkworkCouponRollbackInput): Promise<SdkworkUserCoupon>;
  useCoupon(input: SdkworkCouponUseInput): Promise<SdkworkUserCoupon>;
}

interface RemotePageEnvelope<T> {
  content?: T[];
}

interface RemoteCouponStatistics {
  expiredCount?: number | string;
  totalCoupons?: number | string;
  unusedCount?: number | string;
  usedCount?: number | string;
}

function createEmptyDashboard(): SdkworkCouponDashboardData {
  return {
    availableCoupons: [],
    catalogCoupons: [],
    catalogDigest: summarizeSdkworkCouponCatalog([]),
    myCoupons: [],
    statistics: {
      expiredCount: 0,
      totalCoupons: 0,
      unusedCount: 0,
      usedCount: 0,
    },
    userDigest: summarizeSdkworkUserCoupons([]),
  };
}

function mapStatistics(statistics: RemoteCouponStatistics | null | undefined): SdkworkCouponStatistics {
  return {
    expiredCount: toNullableSdkworkCommerceNumber(statistics?.expiredCount) ?? 0,
    totalCoupons: toNullableSdkworkCommerceNumber(statistics?.totalCoupons) ?? 0,
    unusedCount: toNullableSdkworkCommerceNumber(statistics?.unusedCount) ?? 0,
    usedCount: toNullableSdkworkCommerceNumber(statistics?.usedCount) ?? 0,
  };
}

function mergeUserCoupon(
  coupon: SdkworkUserCoupon,
  fallback: SdkworkUserCoupon | undefined,
): SdkworkUserCoupon {
  if (!fallback) {
    return coupon;
  }

  return {
    ...fallback,
    ...coupon,
    amountCny: coupon.amountCny ?? fallback.amountCny,
    couponId: coupon.couponId ?? fallback.couponId,
    minimumSpendCny: coupon.minimumSpendCny ?? fallback.minimumSpendCny,
    pointCost: coupon.pointCost ?? fallback.pointCost,
    userCouponId: coupon.userCouponId ?? fallback.userCouponId,
  };
}

function stripPrefixedId(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function createRequestNo(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSdkworkCouponService(
  options: CreateSdkworkCouponServiceOptions = {},
): SdkworkCouponService {
  const copy = createSdkworkCouponMessages(options.locale, options.messages).service;
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();
  const pageSize = options.pageSize ?? 20;

  return {
    async cancelUseCoupon(userCouponId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedUserCouponId = stripPrefixedId(userCouponId, "user-coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.discountApplications.reversals.create({
          userCouponId: normalizedUserCouponId,
        }),
        copy.cancelUseFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async exchangeCouponByPoints(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const couponId = stripPrefixedId(input.couponId, "coupon-");
      const requestNo = input.requestNo ?? createRequestNo("coupon-points");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.userCoupons.claims.create({
          offerId: couponId,
          requestNo,
          sourceType: "points_exchange",
        }),
        copy.exchangeFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async getCouponDetail(couponId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedCouponId = stripPrefixedId(couponId, "coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteCouponLike>(
        await getCommerceService().promotions.offers.retrieve(normalizedCouponId),
        copy.couponDetailFailed,
      );

      return normalizeSdkworkRemoteCoupon(result);
    },

    async getDashboard() {
      if (!hasSdkworkCommerceSession()) {
        return createEmptyDashboard();
      }

      const [catalogPayload, myPayload, availablePayload] = await Promise.all([
        getCommerceService().promotions.offers.list({
            page: 1,
            page_size: pageSize,
        }),
        getCommerceService().promotions.userCoupons.wallet.list({
            page: 1,
            page_size: pageSize,
        }),
        getCommerceService().promotions.userCoupons.wallet.list({
            page: 1,
            page_size: pageSize,
            status: "available",
        }),
      ]);
      const catalogPage = unwrapSdkworkCommerceResponse<RemotePageEnvelope<SdkworkRemoteCouponLike>>(
        catalogPayload,
        copy.requestFailed,
      );
      const myPage = unwrapSdkworkCommerceResponse<RemotePageEnvelope<SdkworkRemoteUserCouponLike>>(
        myPayload,
        copy.requestFailed,
      );
      const availablePage = unwrapSdkworkCommerceResponse<RemotePageEnvelope<SdkworkRemoteUserCouponLike>>(
        availablePayload,
        copy.requestFailed,
      );

      const catalogCoupons = sortSdkworkCouponCatalog(
        (catalogPage.content ?? []).map((coupon, index) => normalizeSdkworkRemoteCoupon(coupon, index)),
      );
      const myCoupons = sortSdkworkUserCoupons(
        (myPage.content ?? []).map((coupon, index) => normalizeSdkworkRemoteUserCoupon(coupon, index)),
      );
      const availableCouponsFromRemote = sortSdkworkUserCoupons(
        (availablePage.content ?? []).map((coupon, index) => normalizeSdkworkRemoteUserCoupon(coupon, index)),
      );
      const myCouponsByKey = new Map(
        myCoupons.flatMap((coupon) => [
          [coupon.userCouponId, coupon],
          [coupon.couponId, coupon],
          [coupon.id, coupon],
        ]).filter((entry): entry is [string, SdkworkUserCoupon] => Boolean(entry[0])),
      );
      const availableCoupons = availableCouponsFromRemote.length > 0
        ? availableCouponsFromRemote.map((coupon) =>
            mergeUserCoupon(
              coupon,
              myCouponsByKey.get(coupon.userCouponId ?? "")
              ?? myCouponsByKey.get(coupon.couponId ?? "")
              ?? myCouponsByKey.get(coupon.id),
            ),
          )
        : myCoupons.filter((coupon) => coupon.status === "available");

      const statistics = {
        expiredCount: myCoupons.filter((coupon) => coupon.status === "expired").length,
        totalCoupons: myCoupons.length,
        unusedCount: myCoupons.filter((coupon) => coupon.status === "available").length,
        usedCount: myCoupons.filter((coupon) => coupon.status === "used").length,
      };

      return {
        availableCoupons,
        catalogCoupons,
        catalogDigest: summarizeSdkworkCouponCatalog(catalogCoupons),
        myCoupons,
        statistics: mapStatistics(statistics),
        userDigest: summarizeSdkworkUserCoupons(myCoupons.map((coupon) => ({
          discountAmountCny: coupon.amountCny,
          id: coupon.id,
          remainingDays: coupon.remainingDays,
          status: coupon.status,
        }))),
      };
    },

    getEmptyDashboard() {
      return createEmptyDashboard();
    },

    async getUserCouponDetail(userCouponId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedUserCouponId = stripPrefixedId(userCouponId, "user-coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.userCoupons.wallet.retrieve(normalizedUserCouponId),
        copy.userCouponDetailFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async receiveCoupon(couponId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedCouponId = stripPrefixedId(couponId, "coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.userCoupons.claims.create({ offerId: normalizedCouponId }),
        copy.receiveFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async redeemCoupon(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.codes.redemptions.create({
          channel: toSdkworkCommerceOptionalString(input.channel),
          code: input.redeemCode,
        }),
        copy.redeemFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async rollbackPointsExchange(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedUserCouponId = stripPrefixedId(input.userCouponId, "user-coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.discountApplications.reversals.create({
          reason: toSdkworkCommerceOptionalString(input.reason),
          userCouponId: normalizedUserCouponId,
        }),
        copy.rollbackFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },

    async useCoupon(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const normalizedUserCouponId = stripPrefixedId(input.userCouponId, "user-coupon-");
      const result = unwrapSdkworkCommerceResponse<SdkworkRemoteUserCouponLike>(
        await getCommerceService().promotions.discountApplications.create({
          orderId: input.orderId,
          userCouponId: normalizedUserCouponId,
        }),
        copy.useFailed,
      );

      return normalizeSdkworkRemoteUserCoupon(result);
    },
  };
}

export const sdkworkCouponService = createSdkworkCouponService();
