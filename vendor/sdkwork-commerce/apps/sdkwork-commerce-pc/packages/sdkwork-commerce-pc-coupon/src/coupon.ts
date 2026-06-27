import {
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
} from "@sdkwork/commerce-service";

export interface SdkworkAppCapabilityManifest {
  description: string;
  host?: string;
  id: string;
  packageNames: string[];
  theme?: string;
  title: string;
}

export interface CreateSdkworkAppCapabilityManifestOptions {
  description?: string;
  host?: string;
  id?: string;
  packageNames?: string[];
  theme?: string;
  title?: string;
}

function createSdkworkAppCapabilityManifest(
  options: CreateSdkworkAppCapabilityManifestOptions = {},
): SdkworkAppCapabilityManifest {
  return {
    description: options.description ?? "",
    ...(options.host ? { host: options.host } : {}),
    id: options.id ?? "sdkwork-capability",
    packageNames: [...(options.packageNames ?? [])],
    ...(options.theme ? { theme: options.theme } : {}),
    title: options.title ?? "Capability",
  };
}

export type SdkworkCouponTab = "discover" | "history" | "my";
export type SdkworkCouponStatus = "available" | "expired" | "inactive" | "used";
export type SdkworkCouponType = "cash" | "discount" | "gift" | "points-exchange" | "unknown";
export type SdkworkCouponAcquireType = "admin-grant" | "points-exchange" | "receive" | "redeem-code" | "unknown";

export interface SdkworkCouponWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "coupon";
  routePath: string;
}

export interface CreateCouponWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export interface SdkworkCouponRouteIntent {
  couponId?: string;
  focusWindow: boolean;
  route: string;
  source: "coupon-workspace";
  tab?: SdkworkCouponTab;
  type: "coupon-route-intent";
  userCouponId?: string;
}

export interface CreateCouponRouteIntentOptions {
  basePath?: string;
  couponId?: string;
  focusWindow?: boolean;
  tab?: SdkworkCouponTab;
  userCouponId?: string;
}

export interface SdkworkCouponCatalog {
  amountCny: number | null;
  canReceive: boolean;
  couponId?: string;
  description?: string;
  discountRate: number | null;
  endTime?: string;
  getLimit: number | null;
  id: string;
  minimumSpendCny: number | null;
  name: string;
  pointCost: number | null;
  pointsExchange: boolean;
  receivedCount: number | null;
  remainingCount: number | null;
  scopeType?: string;
  scopeValue?: string;
  stackable: boolean;
  startTime?: string;
  status: SdkworkCouponStatus;
  statusLabel?: string;
  total: number | null;
  type: SdkworkCouponType;
  typeLabel?: string;
  usedCount: number | null;
}

export interface SdkworkUserCoupon {
  acquireAt?: string;
  acquireType?: SdkworkCouponAcquireType;
  amountCny: number | null;
  available: boolean;
  code?: string;
  couponId?: string;
  expireAt?: string;
  id: string;
  minimumSpendCny: number | null;
  name: string;
  orderId?: string;
  pointCost: number | null;
  pointsRefundAt?: string;
  pointsRefunded: boolean;
  remainingDays: number | null;
  scopeType?: string;
  scopeValue?: string;
  status: SdkworkCouponStatus;
  statusLabel?: string;
  type: SdkworkCouponType;
  typeLabel?: string;
  useAt?: string;
  userCouponId?: string;
  discountRate?: number | null;
}

export interface SdkworkCouponCatalogDigestInput {
  canReceive: boolean;
  id: string;
  pointsExchange: boolean;
  status: SdkworkCouponStatus;
}

export interface SdkworkCouponCatalogDigest {
  claimableCoupons: number;
  pointsExchangeCoupons: number;
  totalCoupons: number;
}

export interface SdkworkUserCouponDigestInput {
  discountAmountCny?: number | null;
  id: string;
  remainingDays?: number | null;
  status: SdkworkCouponStatus;
}

export interface SdkworkUserCouponDigest {
  availableCoupons: number;
  expiringSoonCoupons: number;
  highestDiscountAmountCny: number;
  totalCoupons: number;
}

export interface SdkworkCouponDiscountInput {
  discountAmountCny?: number | null;
  discountRate?: number | null;
  id: string;
  minimumSpendCny?: number | null;
  name: string;
  status?: SdkworkCouponStatus;
}

export interface SdkworkRemoteCouponLike {
  amount?: unknown;
  canReceive?: unknown;
  couponId?: unknown;
  description?: unknown;
  discount?: unknown;
  getLimit?: unknown;
  minConsume?: unknown;
  name?: unknown;
  pointCost?: unknown;
  pointsExchange?: unknown;
  receivedCount?: unknown;
  remainingCount?: unknown;
  scopeType?: unknown;
  scopeValue?: unknown;
  stackable?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  status?: unknown;
  statusName?: unknown;
  total?: unknown;
  type?: unknown;
  typeName?: unknown;
  usedCount?: unknown;
}

export interface SdkworkRemoteUserCouponLike {
  acquireAt?: unknown;
  acquireType?: unknown;
  amount?: unknown;
  available?: unknown;
  couponCode?: unknown;
  couponId?: unknown;
  couponName?: unknown;
  discount?: unknown;
  expireAt?: unknown;
  minConsume?: unknown;
  orderId?: unknown;
  pointCost?: unknown;
  pointsRefundAt?: unknown;
  pointsRefunded?: unknown;
  remainingDays?: unknown;
  scopeType?: unknown;
  scopeValue?: unknown;
  status?: unknown;
  statusName?: unknown;
  type?: unknown;
  typeName?: unknown;
  useAt?: unknown;
  userCouponId?: unknown;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/coupons").trim();
  if (!normalized || normalized === "/") {
    return "/coupons";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function normalizeDiscountMultiplier(rate: number | null | undefined): number | null {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  if (rate <= 1) {
    return rate;
  }

  if (rate <= 10) {
    return rate / 10;
  }

  if (rate <= 100) {
    return rate / 100;
  }

  return null;
}

export function normalizeSdkworkCouponType(value: unknown): SdkworkCouponType {
  const normalized = (toSdkworkCommerceOptionalString(value) || "").toUpperCase();

  if (normalized === "CASH") {
    return "cash";
  }

  if (normalized === "DISCOUNT") {
    return "discount";
  }

  if (normalized === "GIFT") {
    return "gift";
  }

  if (normalized === "POINTS_EXCHANGE") {
    return "points-exchange";
  }

  return "unknown";
}

export function normalizeSdkworkCouponAcquireType(value: unknown): SdkworkCouponAcquireType {
  const normalized = (toSdkworkCommerceOptionalString(value) || "").toUpperCase();

  if (normalized === "RECEIVE") {
    return "receive";
  }

  if (normalized === "REDEEM_CODE") {
    return "redeem-code";
  }

  if (normalized === "POINTS_EXCHANGE") {
    return "points-exchange";
  }

  if (normalized === "ADMIN_GRANT") {
    return "admin-grant";
  }

  return "unknown";
}

export function normalizeSdkworkCouponStatus(value: unknown, available?: unknown): SdkworkCouponStatus {
  const normalized = (toSdkworkCommerceOptionalString(value) || "").toUpperCase();

  if (
    available === true
    || normalized === "UNUSED"
    || normalized === "AVAILABLE"
    || normalized === "ACTIVE"
  ) {
    return "available";
  }

  if (normalized === "USED") {
    return "used";
  }

  if (normalized === "EXPIRED") {
    return "expired";
  }

  return "inactive";
}

export function normalizeSdkworkRemoteCoupon(
  coupon: SdkworkRemoteCouponLike,
  index = 0,
): SdkworkCouponCatalog {
  const couponId = toSdkworkCommerceOptionalString(coupon.couponId);

  return {
    amountCny: toNullableSdkworkCommerceNumber(coupon.amount),
    canReceive: coupon.canReceive !== false && normalizeSdkworkCouponStatus(coupon.status, coupon.canReceive) === "available",
    couponId,
    description: toSdkworkCommerceOptionalString(coupon.description),
    discountRate: toNullableSdkworkCommerceNumber(coupon.discount),
    endTime: toSdkworkCommerceOptionalString(coupon.endTime),
    getLimit: toNullableSdkworkCommerceNumber(coupon.getLimit),
    id: `coupon-${couponId || index + 1}`,
    minimumSpendCny: toNullableSdkworkCommerceNumber(coupon.minConsume),
    name: toSdkworkCommerceOptionalString(coupon.name) || "Coupon",
    pointCost: toNullableSdkworkCommerceNumber(coupon.pointCost),
    pointsExchange: coupon.pointsExchange === true,
    receivedCount: toNullableSdkworkCommerceNumber(coupon.receivedCount),
    remainingCount: toNullableSdkworkCommerceNumber(coupon.remainingCount),
    scopeType: toSdkworkCommerceOptionalString(coupon.scopeType),
    scopeValue: toSdkworkCommerceOptionalString(coupon.scopeValue),
    stackable: coupon.stackable === true,
    startTime: toSdkworkCommerceOptionalString(coupon.startTime),
    status: normalizeSdkworkCouponStatus(coupon.status, coupon.canReceive),
    statusLabel: toSdkworkCommerceOptionalString(coupon.statusName),
    total: toNullableSdkworkCommerceNumber(coupon.total),
    type: normalizeSdkworkCouponType(coupon.type),
    typeLabel: toSdkworkCommerceOptionalString(coupon.typeName),
    usedCount: toNullableSdkworkCommerceNumber(coupon.usedCount),
  };
}

export function normalizeSdkworkRemoteUserCoupon(
  coupon: SdkworkRemoteUserCouponLike,
  index = 0,
): SdkworkUserCoupon {
  const couponId = toSdkworkCommerceOptionalString(coupon.couponId);
  const userCouponId = toSdkworkCommerceOptionalString(coupon.userCouponId);

  return {
    acquireAt: toSdkworkCommerceOptionalString(coupon.acquireAt),
    acquireType: normalizeSdkworkCouponAcquireType(coupon.acquireType),
    amountCny: toNullableSdkworkCommerceNumber(coupon.amount),
    available: coupon.available === true || normalizeSdkworkCouponStatus(coupon.status, coupon.available) === "available",
    code: toSdkworkCommerceOptionalString(coupon.couponCode),
    couponId,
    discountRate: toNullableSdkworkCommerceNumber(coupon.discount),
    expireAt: toSdkworkCommerceOptionalString(coupon.expireAt),
    id: `user-coupon-${userCouponId || couponId || index + 1}`,
    minimumSpendCny: toNullableSdkworkCommerceNumber(coupon.minConsume),
    name: toSdkworkCommerceOptionalString(coupon.couponName) || "Coupon",
    orderId: toSdkworkCommerceOptionalString(coupon.orderId),
    pointCost: toNullableSdkworkCommerceNumber(coupon.pointCost),
    pointsRefundAt: toSdkworkCommerceOptionalString(coupon.pointsRefundAt),
    pointsRefunded: coupon.pointsRefunded === true,
    remainingDays: toNullableSdkworkCommerceNumber(coupon.remainingDays),
    scopeType: toSdkworkCommerceOptionalString(coupon.scopeType),
    scopeValue: toSdkworkCommerceOptionalString(coupon.scopeValue),
    status: normalizeSdkworkCouponStatus(coupon.status, coupon.available),
    statusLabel: toSdkworkCommerceOptionalString(coupon.statusName),
    type: normalizeSdkworkCouponType(coupon.type),
    typeLabel: toSdkworkCommerceOptionalString(coupon.typeName),
    useAt: toSdkworkCommerceOptionalString(coupon.useAt),
    userCouponId,
  };
}

export function sortSdkworkCouponCatalog(coupons: readonly SdkworkCouponCatalog[]): SdkworkCouponCatalog[] {
  return [...coupons].sort(
    (left, right) =>
      Number(right.canReceive) - Number(left.canReceive)
      || Number(right.pointsExchange) - Number(left.pointsExchange)
      || toSdkworkCommerceNumber(right.amountCny) - toSdkworkCommerceNumber(left.amountCny)
      || toSdkworkCommerceNumber(right.discountRate) - toSdkworkCommerceNumber(left.discountRate)
      || toSdkworkCommerceNumber(left.pointCost ?? Number.MAX_SAFE_INTEGER) - toSdkworkCommerceNumber(right.pointCost ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name),
  );
}

export function sortSdkworkUserCoupons(coupons: readonly SdkworkUserCoupon[]): SdkworkUserCoupon[] {
  return [...coupons].sort(
    (left, right) =>
      Number(right.status === "available") - Number(left.status === "available")
      || toSdkworkCommerceNumber(right.amountCny) - toSdkworkCommerceNumber(left.amountCny)
      || toSdkworkCommerceNumber(right.discountRate) - toSdkworkCommerceNumber(left.discountRate)
      || toSdkworkCommerceNumber(left.remainingDays ?? Number.MAX_SAFE_INTEGER) - toSdkworkCommerceNumber(right.remainingDays ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name),
  );
}

export function estimateSdkworkCouponDiscountAmount(
  amountCny: number,
  coupon: SdkworkCouponDiscountInput | null | undefined,
): number {
  if (!coupon || coupon.status === "expired" || coupon.status === "inactive" || coupon.status === "used") {
    return 0;
  }

  const priceCny = Math.max(toSdkworkCommerceNumber(amountCny), 0);
  if (priceCny <= 0) {
    return 0;
  }

  const minimumSpendCny = coupon.minimumSpendCny ?? null;
  if (minimumSpendCny !== null && priceCny < minimumSpendCny) {
    return 0;
  }

  const fixedDiscount = Math.max(toSdkworkCommerceNumber(coupon.discountAmountCny), 0);
  if (fixedDiscount > 0) {
    return Math.min(fixedDiscount, priceCny);
  }

  const discountMultiplier = normalizeDiscountMultiplier(coupon.discountRate ?? null);
  if (discountMultiplier === null) {
    return 0;
  }

  return Math.max(0, Math.min(priceCny, Math.round((priceCny * (1 - discountMultiplier)) * 100) / 100));
}

export function summarizeSdkworkCouponCatalog(
  coupons: readonly SdkworkCouponCatalogDigestInput[],
): SdkworkCouponCatalogDigest {
  return coupons.reduce<SdkworkCouponCatalogDigest>(
    (summary, coupon) => {
      summary.totalCoupons += 1;

      if (coupon.canReceive && coupon.status === "available") {
        summary.claimableCoupons += 1;
      }

      if (coupon.pointsExchange) {
        summary.pointsExchangeCoupons += 1;
      }

      return summary;
    },
    {
      claimableCoupons: 0,
      pointsExchangeCoupons: 0,
      totalCoupons: 0,
    },
  );
}

export function summarizeSdkworkUserCoupons(
  coupons: readonly SdkworkUserCouponDigestInput[],
): SdkworkUserCouponDigest {
  return coupons.reduce<SdkworkUserCouponDigest>(
    (summary, coupon) => {
      summary.totalCoupons += 1;
      summary.highestDiscountAmountCny = Math.max(summary.highestDiscountAmountCny, toSdkworkCommerceNumber(coupon.discountAmountCny));

      if (coupon.status === "available") {
        summary.availableCoupons += 1;
        if ((coupon.remainingDays ?? null) !== null && (coupon.remainingDays ?? Number.MAX_SAFE_INTEGER) <= 7) {
          summary.expiringSoonCoupons += 1;
        }
      }

      return summary;
    },
    {
      availableCoupons: 0,
      expiringSoonCoupons: 0,
      highestDiscountAmountCny: 0,
      totalCoupons: 0,
    },
  );
}

export function resolveSdkworkUserCouponRequestId(
  coupon: Pick<SdkworkUserCoupon, "couponId" | "id" | "userCouponId">,
): string | undefined {
  if (coupon.userCouponId) {
    return coupon.userCouponId;
  }

  if (coupon.couponId) {
    return coupon.couponId;
  }

  if (coupon.id.startsWith("user-coupon-")) {
    return coupon.id.slice("user-coupon-".length);
  }

  return undefined;
}

export function createCouponWorkspaceManifest({
  description = "Coupon workspace for discovery, redemption, points exchange, and reusable checkout discount operations.",
  host,
  id = "sdkwork-coupon",
  packageNames = ["@sdkwork/commerce-pc-coupon"],
  routePath = "/coupons",
  theme,
  title = "Coupons",
}: CreateCouponWorkspaceManifestOptions = {}): SdkworkCouponWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "coupon",
    routePath: normalizeBasePath(routePath),
  };
}

export function createCouponRouteIntent(
  options: CreateCouponRouteIntentOptions = {},
): SdkworkCouponRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.tab) {
    queryParams.set("tab", options.tab);
  }

  if (options.couponId) {
    queryParams.set("couponId", options.couponId);
  }

  if (options.userCouponId) {
    queryParams.set("userCouponId", options.userCouponId);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    ...(options.couponId ? { couponId: options.couponId } : {}),
    focusWindow: options.focusWindow !== false,
    route: `${basePath}${querySuffix}`,
    source: "coupon-workspace",
    ...(options.tab ? { tab: options.tab } : {}),
    type: "coupon-route-intent",
    ...(options.userCouponId ? { userCouponId: options.userCouponId } : {}),
  };
}

export const couponPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-coupon",
  status: "ready",
} as const;

export type CouponPackageMeta = typeof couponPackageMeta;
