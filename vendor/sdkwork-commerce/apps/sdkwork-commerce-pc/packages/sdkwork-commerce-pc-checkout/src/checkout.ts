import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";
import type { SdkworkCommercialAction } from "@sdkwork/commerce-pc-offer";

export type SdkworkCheckoutSourceKind =
  | "subscription"
  | "wallet-recharge"
  | "points-recharge"
  | "offer-bundle";

export type SdkworkCheckoutPaymentMethodKind =
  | "card"
  | "other"
  | "qr"
  | "wallet";

export type SdkworkCheckoutInvoiceTitleType = "company" | "personal" | "unknown";

export interface SdkworkCheckoutWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "checkout";
  routePath: string;
}

export interface CreateCheckoutWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export interface SdkworkCheckoutRouteIntent {
  focusWindow: boolean;
  kind?: SdkworkCheckoutSourceKind;
  route: string;
  source: "checkout-workspace";
  sourceId?: string;
  type: "checkout-route-intent";
}

export interface CreateCheckoutRouteIntentOptions {
  basePath?: string;
  focusWindow?: boolean;
  kind?: SdkworkCheckoutSourceKind;
  sourceId?: string;
}

export interface SdkworkCheckoutSource {
  action: SdkworkCommercialAction;
  billingLabel: string;
  description: string;
  id: string;
  invoiceEligible: boolean;
  kind: SdkworkCheckoutSourceKind;
  meta?: Record<string, unknown>;
  originalAmountCny: number;
  quantity: number;
  recommended: boolean;
  tags: string[];
  title: string;
  unitLabel: string;
}

export interface SdkworkCheckoutCoupon {
  discountAmountCny: number;
  id: string;
  label: string;
  minimumSpendCny?: number | null;
  sourceKinds?: SdkworkCheckoutSourceKind[];
}

export interface SdkworkCheckoutPaymentMethod {
  available: boolean;
  code: string;
  description?: string;
  id: string;
  kind: SdkworkCheckoutPaymentMethodKind;
  label: string;
  recommended: boolean;
}

export interface SdkworkCheckoutInvoicePolicy {
  available: boolean;
  enabledByDefault: boolean;
  title?: string;
  titleType: SdkworkCheckoutInvoiceTitleType;
}

export interface SdkworkCheckoutCatalogData {
  invoicePolicy: SdkworkCheckoutInvoicePolicy;
  isAuthenticated: boolean;
  paymentMethods: SdkworkCheckoutPaymentMethod[];
  sources: SdkworkCheckoutSource[];
  userCoupons: SdkworkCheckoutCoupon[];
  walletBalanceCny: number;
}

export interface SdkworkCheckoutSummary {
  balanceCoverageCny: number;
  couponLabel: string | null;
  discountAmountCny: number;
  invoiceEligible: boolean;
  invoiceRequested: boolean;
  originalAmountCny: number;
  payableAmountCny: number;
  paymentMethodLabel: string | null;
}

export interface SdkworkCheckoutSession {
  availableCoupons: SdkworkCheckoutCoupon[];
  invoiceRequested: boolean;
  selectedCouponId: string | null;
  selectedPaymentMethodId: string | null;
  source: SdkworkCheckoutSource | null;
  summary: SdkworkCheckoutSummary;
}

export interface BuildSdkworkCheckoutSessionOptions {
  catalog: SdkworkCheckoutCatalogData;
  invoiceRequested?: boolean;
  selectedCouponId?: string | null;
  selectedPaymentMethodId?: string | null;
  selectedSourceId?: string | null;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/checkout").trim();
  if (!normalized || normalized === "/") {
    return "/checkout";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortCoupons(coupons: readonly SdkworkCheckoutCoupon[]): SdkworkCheckoutCoupon[] {
  return [...coupons].sort(
    (left, right) =>
      toSafeNumber(right.discountAmountCny) - toSafeNumber(left.discountAmountCny)
      || toSafeNumber(left.minimumSpendCny) - toSafeNumber(right.minimumSpendCny)
      || left.label.localeCompare(right.label),
  );
}

function resolveSource(
  sources: readonly SdkworkCheckoutSource[],
  selectedSourceId: string | null | undefined,
): SdkworkCheckoutSource | null {
  if (selectedSourceId) {
    return sources.find((source) => source.id === selectedSourceId) ?? null;
  }

  return sources.find((source) => source.recommended) ?? sources[0] ?? null;
}

function isCouponApplicable(
  coupon: SdkworkCheckoutCoupon,
  source: SdkworkCheckoutSource | null,
): boolean {
  if (!source) {
    return false;
  }

  if (Array.isArray(coupon.sourceKinds) && coupon.sourceKinds.length > 0 && !coupon.sourceKinds.includes(source.kind)) {
    return false;
  }

  return toSafeNumber(coupon.minimumSpendCny) <= toSafeNumber(source.originalAmountCny);
}

function resolveApplicableCoupons(
  coupons: readonly SdkworkCheckoutCoupon[],
  source: SdkworkCheckoutSource | null,
): SdkworkCheckoutCoupon[] {
  return sortCoupons(coupons.filter((coupon) => isCouponApplicable(coupon, source)));
}

function resolveSelectedCoupon(
  coupons: readonly SdkworkCheckoutCoupon[],
  selectedCouponId: string | null | undefined,
): SdkworkCheckoutCoupon | null {
  if (selectedCouponId === null) {
    return null;
  }

  if (selectedCouponId) {
    return coupons.find((coupon) => coupon.id === selectedCouponId) ?? null;
  }

  return coupons[0] ?? null;
}

function resolveSelectedPaymentMethod(
  methods: readonly SdkworkCheckoutPaymentMethod[],
  selectedPaymentMethodId: string | null | undefined,
): SdkworkCheckoutPaymentMethod | null {
  const availableMethods = methods.filter((method) => method.available);

  if (selectedPaymentMethodId) {
    return availableMethods.find((method) => method.id === selectedPaymentMethodId) ?? null;
  }

  return availableMethods.find((method) => method.recommended) ?? availableMethods[0] ?? null;
}

export function createEmptySdkworkCheckoutCatalog(): SdkworkCheckoutCatalogData {
  return {
    invoicePolicy: {
      available: false,
      enabledByDefault: false,
      title: undefined,
      titleType: "personal",
    },
    isAuthenticated: false,
    paymentMethods: [],
    sources: [],
    userCoupons: [],
    walletBalanceCny: 0,
  };
}

export function buildSdkworkCheckoutSession({
  catalog,
  invoiceRequested,
  selectedCouponId,
  selectedPaymentMethodId,
  selectedSourceId,
}: BuildSdkworkCheckoutSessionOptions): SdkworkCheckoutSession {
  const source = resolveSource(catalog.sources, selectedSourceId);
  const availableCoupons = resolveApplicableCoupons(catalog.userCoupons, source);
  const selectedCoupon = resolveSelectedCoupon(availableCoupons, selectedCouponId);
  const selectedPaymentMethod = resolveSelectedPaymentMethod(catalog.paymentMethods, selectedPaymentMethodId);
  const originalAmountCny = toSafeNumber(source?.originalAmountCny);
  const discountAmountCny = Math.min(
    originalAmountCny,
    roundCurrency(toSafeNumber(selectedCoupon?.discountAmountCny)),
  );
  const payableAmountCny = roundCurrency(Math.max(0, originalAmountCny - discountAmountCny));
  const balanceCoverageCny = roundCurrency(
    Math.min(toSafeNumber(catalog.walletBalanceCny), payableAmountCny),
  );
  const invoiceEligible = Boolean(source?.invoiceEligible && catalog.invoicePolicy.available);
  const resolvedInvoiceRequested = invoiceEligible
    ? (typeof invoiceRequested === "boolean" ? invoiceRequested : catalog.invoicePolicy.enabledByDefault)
    : false;

  return {
    availableCoupons,
    invoiceRequested: resolvedInvoiceRequested,
    selectedCouponId: selectedCoupon?.id ?? null,
    selectedPaymentMethodId: selectedPaymentMethod?.id ?? null,
    source,
    summary: {
      balanceCoverageCny,
      couponLabel: selectedCoupon?.label ?? null,
      discountAmountCny,
      invoiceEligible,
      invoiceRequested: resolvedInvoiceRequested,
      originalAmountCny,
      payableAmountCny,
      paymentMethodLabel: selectedPaymentMethod?.label ?? null,
    },
  };
}

export function createCheckoutWorkspaceManifest({
  description = "Checkout workspace for reusable transaction sessions, payment method selection, coupon application, and invoice-aware submission flows.",
  host,
  id = "sdkwork-checkout",
  packageNames = [
    "@sdkwork/commerce-pc-checkout",
    "@sdkwork/commerce-pc-pricing",
    "@sdkwork/commerce-pc-coupon",
    "@sdkwork/commerce-pc-payment",
    "@sdkwork/commerce-pc-order",
    "@sdkwork/commerce-pc-invoice",
  ],
  routePath = "/checkout",
  theme,
  title = "Checkout",
}: CreateCheckoutWorkspaceManifestOptions = {}): SdkworkCheckoutWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "checkout",
    routePath: normalizeBasePath(routePath),
  };
}

export function resolveCheckoutRouteSearchParams(
  searchParams: URLSearchParams | Readonly<Record<string, string | null | undefined>>,
): {
  kind?: SdkworkCheckoutSourceKind;
  mode?: string;
  sourceId?: string;
} {
  const read = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      const value = searchParams.get(key);
      return value && value.trim() ? value.trim() : undefined;
    }

    const value = searchParams[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  const kind = read("kind");
  const sourceId = read("sourceId");
  const mode = read("mode");

  return {
    ...(kind ? { kind: kind as SdkworkCheckoutSourceKind } : {}),
    ...(mode ? { mode } : {}),
    ...(sourceId ? { sourceId } : {}),
  };
}

export function resolveCheckoutRouteWalletRecharge(
  searchParams: URLSearchParams | Readonly<Record<string, string | null | undefined>>,
): {
  packageId?: number;
  points?: number;
  priceCny?: number;
} | null {
  const read = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      const value = searchParams.get(key);
      return value && value.trim() ? value.trim() : undefined;
    }

    const value = searchParams[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  const kind = read("kind");
  if (kind !== "wallet-recharge") {
    return null;
  }

  const points = Number(read("points"));
  const priceCny = Number(read("priceCny"));
  const packageId = Number(read("packageId"));

  return {
    ...(Number.isInteger(packageId) && packageId > 0 ? { packageId } : {}),
    ...(Number.isInteger(points) && points > 0 ? { points } : {}),
    ...(Number.isFinite(priceCny) && priceCny > 0 ? { priceCny } : {}),
  };
}

export function resolveCheckoutRouteSourceId(
  searchParams: URLSearchParams | Readonly<Record<string, string | null | undefined>>,
): string | undefined {
  const { mode, sourceId } = resolveCheckoutRouteSearchParams(searchParams);
  if (!sourceId) {
    return undefined;
  }

  if (mode && mode !== "purchase" && !sourceId.endsWith(`-${mode}`)) {
    return `${sourceId}-${mode}`;
  }

  return sourceId;
}

export function createCheckoutRouteIntent(
  options: CreateCheckoutRouteIntentOptions = {},
): SdkworkCheckoutRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.kind) {
    queryParams.set("kind", options.kind);
  }

  if (options.sourceId) {
    queryParams.set("sourceId", options.sourceId);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    ...(options.kind ? { kind: options.kind } : {}),
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    route: `${basePath}${querySuffix}`,
    source: "checkout-workspace",
    type: "checkout-route-intent",
  };
}

export const checkoutPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-checkout",
  status: "ready",
} as const;

export type CheckoutPackageMeta = typeof checkoutPackageMeta;
