import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";
import {
  estimateSdkworkCouponDiscountAmount,
  type SdkworkCouponDiscountInput,
  type SdkworkCouponStatus,
} from "@sdkwork/commerce-pc-coupon";
import type {
  SdkworkPaymentProductType,
  SdkworkPaymentProductTypeOption,
} from "@sdkwork/commerce-pc-payment";

export type SdkworkSubscriptionAction = "purchase" | "renew" | "upgrade";
export type SdkworkSubscriptionCouponStatus = SdkworkCouponStatus;
export type SdkworkSubscriptionPaymentMethod = "ALIPAY" | "WECHAT";
export type SdkworkSubscriptionStage = "checkout" | "plans";
export type SdkworkSubscriptionPaymentMethodKind = "card" | "other" | "qr" | "wallet";

export interface SdkworkSubscriptionPaymentMethodOption {
  available: boolean;
  code: string;
  description?: string;
  id: string;
  kind: SdkworkSubscriptionPaymentMethodKind;
  label: string;
  paymentMethod: SdkworkSubscriptionPaymentMethod;
  productTypes: SdkworkPaymentProductTypeOption[];
  recommended: boolean;
  recommendedProductType: SdkworkPaymentProductType;
}

export interface SdkworkSubscriptionWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "subscription";
  routePath: string;
}

export interface CreateSubscriptionWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export interface SdkworkSubscriptionRouteIntent {
  focusWindow: boolean;
  mode?: SdkworkSubscriptionAction;
  packageId?: number;
  route: string;
  source: "subscription-workspace";
  type: "subscription-route-intent";
}

export interface CreateSubscriptionRouteIntentOptions {
  basePath?: string;
  focusWindow?: boolean;
  mode?: SdkworkSubscriptionAction;
  packageId?: number;
}

export interface SdkworkSubscriptionPlanEstimateInput {
  durationDays?: number | null;
  id: string;
  includedPoints: number;
  name: string;
  packageId: number;
  priceCny: number;
  recommended: boolean;
  tags: string[];
}

export interface SdkworkSubscriptionCouponEstimateInput extends SdkworkCouponDiscountInput {
  amountCny?: number | null;
}

export interface EstimateSdkworkSubscriptionCheckoutOptions {
  action: SdkworkSubscriptionAction;
  coupon?: SdkworkSubscriptionCouponEstimateInput | null;
  paymentMethodCode?: string | null;
  paymentMethodId?: string | null;
  plan?: SdkworkSubscriptionPlanEstimateInput | null;
}

export interface SdkworkSubscriptionCheckoutEstimate {
  action: SdkworkSubscriptionAction;
  discountAmountCny: number;
  originalAmountCny: number;
  payableAmountCny: number;
  selectedCouponId: string | null;
  selectedPackageId: number | null;
  selectedPaymentMethodCode: string | null;
  selectedPaymentMethodId: string | null;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/subscription").trim();
  if (!normalized || normalized === "/") {
    return "/subscription";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sortPaymentMethods(
  methods: readonly SdkworkSubscriptionPaymentMethodOption[],
): SdkworkSubscriptionPaymentMethodOption[] {
  return [...methods].sort(
    (left, right) =>
      Number(right.available) - Number(left.available)
      || Number(right.recommended) - Number(left.recommended)
      || left.label.localeCompare(right.label),
  );
}

function findPaymentMethodByCode(
  methods: readonly SdkworkSubscriptionPaymentMethodOption[],
  paymentMethodCode: string | null | undefined,
): SdkworkSubscriptionPaymentMethodOption | null {
  const normalizedCode = String(paymentMethodCode || "").trim().toUpperCase();
  const normalizedSubmitMethod = resolveSdkworkSubscriptionPaymentMethod(paymentMethodCode);

  if (!normalizedCode && !normalizedSubmitMethod) {
    return null;
  }

  return methods.find((method) => {
    const methodCode = method.code.trim().toUpperCase();
    return methodCode === normalizedCode || method.paymentMethod === normalizedSubmitMethod;
  }) ?? null;
}

function resolvePaymentMethodDescription(
  recommendedProductType: SdkworkPaymentProductType,
): string | undefined {
  if (recommendedProductType === "native" || recommendedProductType === "jsapi" || recommendedProductType === "miniapp") {
    return "Scan to pay";
  }

  if (recommendedProductType === "pc" || recommendedProductType === "online_bank") {
    return "Desktop payment";
  }

  if (recommendedProductType === "app" || recommendedProductType === "h5") {
    return "Open in payment app";
  }

  return undefined;
}

function createSubscriptionPaymentMethodOption(
  option: Omit<SdkworkSubscriptionPaymentMethodOption, "description"> & {
    description?: string;
  },
): SdkworkSubscriptionPaymentMethodOption {
  return {
    ...option,
    description: option.description ?? resolvePaymentMethodDescription(option.recommendedProductType),
  };
}

export function createDefaultSdkworkSubscriptionPaymentMethodOptions(): SdkworkSubscriptionPaymentMethodOption[] {
  return sortPaymentMethods([
    createSubscriptionPaymentMethodOption({
      available: true,
      code: "WECHAT_PAY",
      id: "wechat-pay",
      kind: "qr",
      label: "WeChat Pay",
      paymentMethod: "WECHAT",
      productTypes: [
        {
          available: true,
          code: "native",
          label: "Native",
        },
      ],
      recommended: true,
      recommendedProductType: "native",
    }),
    createSubscriptionPaymentMethodOption({
      available: true,
      code: "ALIPAY",
      id: "alipay-pay",
      kind: "qr",
      label: "Alipay",
      paymentMethod: "ALIPAY",
      productTypes: [
        {
          available: true,
          code: "pc",
          label: "PC Web",
        },
      ],
      recommended: false,
      recommendedProductType: "pc",
    }),
  ]);
}

export function resolveSdkworkSubscriptionPaymentMethod(
  paymentMethodCode: string | null | undefined,
): SdkworkSubscriptionPaymentMethod | null {
  const normalizedCode = String(paymentMethodCode || "").trim().toUpperCase();

  if (normalizedCode === "ALIPAY") {
    return "ALIPAY";
  }

  if (normalizedCode === "WECHAT" || normalizedCode === "WECHAT_PAY") {
    return "WECHAT";
  }

  return null;
}

export function resolveSdkworkSubscriptionPaymentMethodOption(
  methods: readonly SdkworkSubscriptionPaymentMethodOption[],
  selectedPaymentMethodId: string | null | undefined,
): SdkworkSubscriptionPaymentMethodOption | null {
  const availableMethods = sortPaymentMethods(methods).filter((method) => method.available);

  if (selectedPaymentMethodId) {
    return availableMethods.find((method) => method.id === selectedPaymentMethodId) ?? null;
  }

  return availableMethods.find((method) => method.recommended) ?? availableMethods[0] ?? null;
}

export function estimateSdkworkSubscriptionCheckout({
  action,
  coupon,
  paymentMethodCode,
  paymentMethodId,
  plan,
}: EstimateSdkworkSubscriptionCheckoutOptions): SdkworkSubscriptionCheckoutEstimate {
  const fallbackPaymentMethods = createDefaultSdkworkSubscriptionPaymentMethodOptions();
  const resolvedPaymentMethod = paymentMethodId
    ? resolveSdkworkSubscriptionPaymentMethodOption(fallbackPaymentMethods, paymentMethodId)
    : findPaymentMethodByCode(fallbackPaymentMethods, paymentMethodCode)
      ?? resolveSdkworkSubscriptionPaymentMethodOption(fallbackPaymentMethods, null);
  const originalAmountCny = Math.max(toSafeNumber(plan?.priceCny), 0);
  const discountAmountCny = originalAmountCny > 0
    ? estimateSdkworkCouponDiscountAmount(
        originalAmountCny,
        coupon
          ? {
              ...coupon,
              discountAmountCny: coupon.discountAmountCny ?? coupon.amountCny ?? null,
            }
          : null,
      )
    : 0;
  const payableAmountCny = Math.max(0, Math.round((originalAmountCny - discountAmountCny) * 100) / 100);

  return {
    action,
    discountAmountCny,
    originalAmountCny,
    payableAmountCny,
    selectedCouponId: coupon?.id ?? null,
    selectedPackageId: plan?.packageId ?? null,
    selectedPaymentMethodCode: paymentMethodCode ?? resolvedPaymentMethod?.code ?? null,
    selectedPaymentMethodId: paymentMethodId ?? resolvedPaymentMethod?.id ?? null,
  };
}

export function createSubscriptionWorkspaceManifest({
  description = "Subscription workspace for premium membership checkout, coupon application, and renewal routing.",
  host,
  id = "sdkwork-subscription",
  packageNames = [
    "@sdkwork/commerce-pc-subscription",
    "@sdkwork/commerce-pc-coupon",
    "@sdkwork/commerce-pc-membership",
    "@sdkwork/commerce-pc-wallet",
  ],
  routePath = "/subscription",
  theme,
  title = "Subscription",
}: CreateSubscriptionWorkspaceManifestOptions = {}): SdkworkSubscriptionWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "subscription",
    routePath: normalizeBasePath(routePath),
  };
}

export function createSubscriptionRouteIntent(
  options: CreateSubscriptionRouteIntentOptions = {},
): SdkworkSubscriptionRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.mode) {
    queryParams.set("mode", options.mode);
  }

  if (typeof options.packageId === "number" && Number.isFinite(options.packageId)) {
    queryParams.set("packageId", String(options.packageId));
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    ...(options.mode ? { mode: options.mode } : {}),
    ...(typeof options.packageId === "number" && Number.isFinite(options.packageId)
      ? { packageId: options.packageId }
      : {}),
    route: `${basePath}${querySuffix}`,
    source: "subscription-workspace",
    type: "subscription-route-intent",
  };
}

export const subscriptionPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-subscription",
  status: "ready",
} as const;

export type SubscriptionPackageMeta = typeof subscriptionPackageMeta;
