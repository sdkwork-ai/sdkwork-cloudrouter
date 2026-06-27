import {
  getSdkworkCommerceService,
  requireSdkworkCommerceSession,
  toSdkworkCommerceNumber,
  unwrapSdkworkCommerceResponse,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  createSdkworkPaymentService,
  type SdkworkPaymentMethod,
  type SdkworkPaymentService,
} from "@sdkwork/commerce-pc-payment";
import {
  normalizeSdkworkRemoteUserCoupon,
  sortSdkworkUserCoupons,
  type SdkworkRemoteUserCouponLike,
  type SdkworkUserCoupon,
} from "@sdkwork/commerce-pc-coupon";
import {
  createSdkworkMembershipService,
  type SdkworkMembershipBenefit,
  type SdkworkMembershipDashboardData,
  type SdkworkMembershipLevel,
  type SdkworkMembershipPlan,
  type SdkworkMembershipPurchaseResult,
  type SdkworkMembershipService,
  type SdkworkMembershipSummary,
} from "@sdkwork/commerce-pc-membership";
import {
  createDefaultSdkworkSubscriptionPaymentMethodOptions,
  estimateSdkworkSubscriptionCheckout,
  resolveSdkworkSubscriptionPaymentMethod,
  resolveSdkworkSubscriptionPaymentMethodOption,
  type SdkworkSubscriptionAction,
  type SdkworkSubscriptionCheckoutEstimate,
  type SdkworkSubscriptionPaymentMethod,
  type SdkworkSubscriptionPaymentMethodKind,
  type SdkworkSubscriptionPaymentMethodOption,
} from "./subscription";
import {
  createSdkworkSubscriptionMessages,
  type SdkworkSubscriptionMessagesOverrides,
} from "./subscription-copy";

export interface SdkworkSubscriptionCoupon extends SdkworkUserCoupon {
  discountAmountCny: number | null;
}

export interface SdkworkSubscriptionDashboardData {
  benefits: SdkworkMembershipBenefit[];
  checkout: SdkworkSubscriptionCheckoutEstimate;
  coupons: SdkworkSubscriptionCoupon[];
  levels: SdkworkMembershipLevel[];
  paymentMethods: SdkworkSubscriptionPaymentMethodOption[];
  plans: SdkworkMembershipPlan[];
  summary: SdkworkMembershipSummary;
}

export interface SdkworkSubscriptionMutationInput {
  couponId?: string;
  packageId: number;
  paymentMethod?: SdkworkSubscriptionPaymentMethod;
}

export type SdkworkSubscriptionPurchaseResult = SdkworkMembershipPurchaseResult;

export interface CreateSdkworkSubscriptionServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkSubscriptionMessagesOverrides;
  paymentService?: Partial<Pick<SdkworkPaymentService, "getDashboard" | "getEmptyDashboard">>;
  membershipService?: Partial<SdkworkMembershipService>;
}

export interface SdkworkSubscriptionService {
  getDashboard(): Promise<SdkworkSubscriptionDashboardData>;
  getEmptyDashboard(): SdkworkSubscriptionDashboardData;
  purchaseSubscription(input: SdkworkSubscriptionMutationInput): Promise<SdkworkSubscriptionPurchaseResult>;
  renewSubscription(input: SdkworkSubscriptionMutationInput): Promise<SdkworkSubscriptionPurchaseResult>;
  upgradeSubscription(input: SdkworkSubscriptionMutationInput): Promise<SdkworkSubscriptionPurchaseResult>;
}

interface RemotePageEnvelope<T> {
  content?: T[];
}

function normalizeSdkworkSubscriptionCoupon(
  coupon: SdkworkRemoteUserCouponLike,
  index: number,
): SdkworkSubscriptionCoupon {
  const normalized = normalizeSdkworkRemoteUserCoupon(coupon, index);

  return {
    ...normalized,
    discountAmountCny: normalized.amountCny,
  };
}

function resolveDefaultAction(summary: SdkworkMembershipSummary): SdkworkSubscriptionAction {
  return summary.isMember ? "upgrade" : "purchase";
}

function resolveDefaultPlan(plans: readonly SdkworkMembershipPlan[]): SdkworkMembershipPlan | null {
  return plans.find((plan) => plan.recommended) ?? plans[0] ?? null;
}

function resolveBestCoupon(
  coupons: readonly SdkworkSubscriptionCoupon[],
  plan: SdkworkMembershipPlan | null,
  action: SdkworkSubscriptionAction,
): SdkworkSubscriptionCoupon | null {
  if (!plan) {
    return null;
  }

  return coupons
    .filter((coupon) => coupon.status === "available")
    .map((coupon) => ({
      coupon,
      discountAmountCny: estimateSdkworkSubscriptionCheckout({
        action,
        coupon,
        plan,
      }).discountAmountCny,
    }))
    .filter((item) => item.discountAmountCny > 0)
    .sort(
      (left, right) =>
        right.discountAmountCny - left.discountAmountCny
        || toSdkworkCommerceNumber(left.coupon.remainingDays, Number.MAX_SAFE_INTEGER) - toSdkworkCommerceNumber(right.coupon.remainingDays, Number.MAX_SAFE_INTEGER)
        || left.coupon.name.localeCompare(right.coupon.name),
    )[0]?.coupon ?? null;
}

function resolvePaymentMethodKind(
  method: Pick<SdkworkPaymentMethod, "code" | "productTypes" | "recommendedProductType">,
): SdkworkSubscriptionPaymentMethodKind {
  if (method.recommendedProductType === "native" || method.recommendedProductType === "jsapi" || method.recommendedProductType === "miniapp") {
    return "qr";
  }

  if (
    method.recommendedProductType === "online_bank"
    || method.code.includes("UNION")
    || method.code.includes("CARD")
  ) {
    return "card";
  }

  if (
    method.recommendedProductType === "app"
    || method.recommendedProductType === "h5"
    || method.code.includes("WALLET")
  ) {
    return "wallet";
  }

  if (method.productTypes.some((productType) => productType.code === "native")) {
    return "qr";
  }

  return "other";
}

function resolvePaymentMethodDescription(
  method: Pick<SdkworkPaymentMethod, "recommendedProductType">,
): string | undefined {
  if (method.recommendedProductType === "native" || method.recommendedProductType === "jsapi" || method.recommendedProductType === "miniapp") {
    return "Scan to pay";
  }

  if (method.recommendedProductType === "pc" || method.recommendedProductType === "online_bank") {
    return "Desktop payment";
  }

  if (method.recommendedProductType === "app" || method.recommendedProductType === "h5") {
    return "Open in payment app";
  }

  return undefined;
}

function mapPaymentMethod(
  method: SdkworkPaymentMethod,
  options: {
    recommendedSort: number;
  },
): SdkworkSubscriptionPaymentMethodOption | null {
  const paymentMethod = resolveSdkworkSubscriptionPaymentMethod(method.code);

  if (!paymentMethod) {
    return null;
  }

  return {
    available: method.available !== false,
    code: method.code,
    description: resolvePaymentMethodDescription(method),
    id: method.id,
    kind: resolvePaymentMethodKind(method),
    label: method.label,
    paymentMethod,
    productTypes: [...method.productTypes],
    recommended: method.sort >= options.recommendedSort,
    recommendedProductType: method.recommendedProductType,
  };
}

function resolvePaymentMethods(
  methods: readonly SdkworkPaymentMethod[],
): SdkworkSubscriptionPaymentMethodOption[] {
  const supportedMethods = methods.filter((method) => resolveSdkworkSubscriptionPaymentMethod(method.code));
  const recommendedSort = supportedMethods
    .filter((method) => method.available !== false)
    .reduce((highest, method) => Math.max(highest, method.sort), Number.NEGATIVE_INFINITY);
  const mappedMethods = supportedMethods
    .map((method) => mapPaymentMethod(method, {
      recommendedSort: Number.isFinite(recommendedSort) ? recommendedSort : method.sort,
    }))
    .filter((method): method is SdkworkSubscriptionPaymentMethodOption => Boolean(method))
    .sort(
      (left, right) =>
        Number(right.available) - Number(left.available)
        || Number(right.recommended) - Number(left.recommended)
        || left.label.localeCompare(right.label),
    );

  return mappedMethods.length > 0
    ? mappedMethods
    : createDefaultSdkworkSubscriptionPaymentMethodOptions();
}

function createDashboard(
  membershipDashboard: SdkworkMembershipDashboardData,
  coupons: readonly SdkworkSubscriptionCoupon[],
  paymentMethods: readonly SdkworkSubscriptionPaymentMethodOption[],
): SdkworkSubscriptionDashboardData {
  const action = resolveDefaultAction(membershipDashboard.summary);
  const plan = resolveDefaultPlan(membershipDashboard.plans);
  const coupon = resolveBestCoupon(coupons, plan, action);
  const selectedPaymentMethod = resolveSdkworkSubscriptionPaymentMethodOption(paymentMethods, null);

  return {
    benefits: membershipDashboard.benefits,
    checkout: estimateSdkworkSubscriptionCheckout({
      action,
      coupon,
      paymentMethodCode: selectedPaymentMethod?.code ?? null,
      paymentMethodId: selectedPaymentMethod?.id ?? null,
      plan,
    }),
    coupons: [...coupons],
    levels: membershipDashboard.levels,
    paymentMethods: [...paymentMethods],
    plans: membershipDashboard.plans,
    summary: membershipDashboard.summary,
  };
}

function createEmptyDashboard(membershipService: Pick<SdkworkMembershipService, "getEmptyDashboard">): SdkworkSubscriptionDashboardData {
  return createDashboard(membershipService.getEmptyDashboard(), [], createDefaultSdkworkSubscriptionPaymentMethodOptions());
}

async function runMembershipMutation(
  membershipService: SdkworkMembershipService,
  name: "memberships.purchase" | "memberships.renew" | "memberships.upgrade",
  payload: SdkworkSubscriptionMutationInput,
): Promise<SdkworkSubscriptionPurchaseResult> {
  return name === "memberships.purchase"
    ? membershipService.purchaseMembership(payload)
    : name === "memberships.renew"
      ? membershipService.renewMembership(payload)
      : membershipService.upgradeMembership(payload);
}

export function createSdkworkSubscriptionService(
  options: CreateSdkworkSubscriptionServiceOptions = {},
): SdkworkSubscriptionService {
  const copy = createSdkworkSubscriptionMessages(options.locale, options.messages);
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();
  const membershipService: SdkworkMembershipService = options.membershipService
    ? {
        ...createSdkworkMembershipService({
          commerceService: options.commerceService,
          locale: options.locale,
        }),
        ...options.membershipService,
      }
    : createSdkworkMembershipService({
        commerceService: options.commerceService,
        locale: options.locale,
      });
  const paymentService: SdkworkPaymentService = options.paymentService
    ? {
        ...createSdkworkPaymentService({ commerceService: options.commerceService }),
        ...options.paymentService,
      }
    : createSdkworkPaymentService({ commerceService: options.commerceService });

  return {
    async getDashboard() {
      const membershipDashboard = await membershipService.getDashboard();
      if (!membershipDashboard.summary.isAuthenticated) {
        return createDashboard(membershipDashboard, [], createDefaultSdkworkSubscriptionPaymentMethodOptions());
      }

      const [couponPagePayload, paymentDashboard] = await Promise.all([
        getCommerceService().promotions.userCoupons.wallet.list({
          page: 1,
          page_size: 20,
          status: "available",
        }),
        paymentService.getDashboard(),
      ]);
      const couponPage = unwrapSdkworkCommerceResponse<RemotePageEnvelope<SdkworkRemoteUserCouponLike>>(
        couponPagePayload,
        copy.service.requestFailed,
      );
      const coupons = sortSdkworkUserCoupons(
        (couponPage.content ?? []).map((coupon, index) => normalizeSdkworkSubscriptionCoupon(coupon, index)),
      ) as SdkworkSubscriptionCoupon[];
      const paymentMethods = resolvePaymentMethods(paymentDashboard.methods);

      return createDashboard(membershipDashboard, coupons, paymentMethods);
    },

    getEmptyDashboard() {
      return createEmptyDashboard(membershipService);
    },

    async purchaseSubscription(input) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipMutation(membershipService, "memberships.purchase", input);
    },

    async renewSubscription(input) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipMutation(membershipService, "memberships.renew", input);
    },

    async upgradeSubscription(input) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipMutation(membershipService, "memberships.upgrade", input);
    },
  };
}

export const sdkworkSubscriptionService = createSdkworkSubscriptionService();
