import {
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  createSdkworkCouponService,
  type SdkworkCouponService,
} from "@sdkwork/commerce-pc-coupon";
import {
  createSdkworkInvoiceService,
  type SdkworkInvoiceService,
} from "@sdkwork/commerce-pc-invoice";
import {
  createSdkworkCommercialAction,
  createSdkworkOfferService,
  type SdkworkCommercialAction,
  type SdkworkOfferService,
} from "@sdkwork/commerce-pc-offer";
import {
  createOrderRouteIntent,
  createSdkworkOrderService,
  type SdkworkOrderService,
} from "@sdkwork/commerce-pc-order";
import {
  createPaymentRouteIntent,
  createSdkworkPaymentService,
  type SdkworkPaymentDetail,
  type SdkworkPaymentMethod,
  type SdkworkPaymentService,
} from "@sdkwork/commerce-pc-payment";
import {
  createSdkworkPointsService,
  type SdkworkPointsRechargeOffer,
  type SdkworkPointsService,
} from "@sdkwork/commerce-pc-points";
import {
  createEmptySdkworkPricingCatalog,
  createSdkworkPricingService,
  type SdkworkPricingCatalogData,
  type SdkworkPricingPlan,
  type SdkworkPricingService,
} from "@sdkwork/commerce-pc-pricing";
import {
  createSdkworkSubscriptionService,
  type SdkworkSubscriptionAction,
  type SdkworkSubscriptionService,
} from "@sdkwork/commerce-pc-subscription";
import {
  createMembershipCheckoutSourceId,
  createSdkworkMembershipService,
  type SdkworkMembershipPlan,
  type SdkworkMembershipService,
} from "@sdkwork/commerce-pc-membership";
import {
  createWalletCheckoutSourceId,
  createSdkworkWalletService,
  type SdkworkWalletRechargePackage,
  type SdkworkWalletService,
} from "@sdkwork/commerce-pc-wallet";
import type { SdkworkMediaResource } from "@sdkwork/commerce-service";
import {
  buildSdkworkCheckoutSession,
  createEmptySdkworkCheckoutCatalog,
  type SdkworkCheckoutCatalogData,
  type SdkworkCheckoutCoupon,
  type SdkworkCheckoutPaymentMethod,
  type SdkworkCheckoutSource,
  type SdkworkCheckoutSourceKind,
} from "./checkout";
import {
  createSdkworkCheckoutMessages,
  type SdkworkCheckoutMessages,
  type SdkworkCheckoutMessagesOverrides,
} from "./checkout-copy";

export interface SdkworkCheckoutSubmitInput {
  invoiceRequested?: boolean;
  selectedCouponId?: string | null;
  selectedPaymentMethodId?: string | null;
  sourceId: string;
}

export interface SdkworkCheckoutSubmitResult {
  amountCny: number | null;
  invoiceId?: string;
  nextRoute?: string;
  orderId?: string;
  paymentId?: string;
  qrContent?: string;
  qrImage?: SdkworkMediaResource;
  status: "completed" | "failed" | "pending" | "requires-payment";
}

export interface CreateSdkworkCheckoutServiceOptions {
  commerceService?: SdkworkCommerceService;
  couponService?: Partial<Pick<SdkworkCouponService, "getDashboard" | "getEmptyDashboard">>;
  invoiceService?: Partial<Pick<SdkworkInvoiceService, "createInvoice">>;
  locale?: string | null;
  messages?: SdkworkCheckoutMessagesOverrides;
  offerService?: Partial<Pick<SdkworkOfferService, "getDashboard" | "getEmptyDashboard">>;
  orderService?: Partial<Pick<SdkworkOrderService, "payOrder">>;
  paymentService?: Partial<Pick<SdkworkPaymentService, "createPayment" | "getDashboard" | "getEmptyDashboard">>;
  pointsService?: Partial<Pick<SdkworkPointsService, "getDashboard" | "getEmptyDashboard" | "rechargePoints">>;
  pricingService?: Partial<Pick<SdkworkPricingService, "getCatalog" | "getEmptyCatalog">>;
  membershipService?: Partial<Pick<SdkworkMembershipService, "getDashboard" | "getEmptyDashboard">>;
  subscriptionService?: Partial<
    Pick<SdkworkSubscriptionService, "purchaseSubscription" | "renewSubscription" | "upgradeSubscription">
  >;
  walletService?: Partial<Pick<SdkworkWalletService, "getOverview" | "rechargePoints">>;
}

export interface SdkworkCheckoutService {
  getCatalog(): Promise<SdkworkCheckoutCatalogData>;
  getEmptyCatalog(): SdkworkCheckoutCatalogData;
  submitCheckout(input: SdkworkCheckoutSubmitInput): Promise<SdkworkCheckoutSubmitResult>;
}

type SdkworkCheckoutServiceCopy = SdkworkCheckoutMessages["service"];

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function includesSourceToken(normalized: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => normalized.includes(token));
}

function normalizeCouponSourceKinds(coupon: {
  id: string;
  label: string;
}): SdkworkCheckoutSourceKind[] {
  const normalized = `${coupon.id} ${coupon.label}`.toLowerCase();

  if (includesSourceToken(normalized, ["recharge", "wallet", "\u5145\u503c", "\u94b1\u5305"])) {
    return ["wallet-recharge", "points-recharge"];
  }

  if (includesSourceToken(normalized, ["points", "point", "\u79ef\u5206"])) {
    return ["points-recharge"];
  }

  if (includesSourceToken(normalized, ["offer", "bundle", "\u7ec4\u5408", "\u5957\u9910"])) {
    return ["offer-bundle"];
  }

  return ["subscription"];
}

function mapCouponScopeTokenToSourceKinds(token: string | undefined): SdkworkCheckoutSourceKind[] {
  const normalized = (token || "").trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const sourceKinds = new Set<SdkworkCheckoutSourceKind>();

  if (includesSourceToken(normalized, ["subscription", "membership", "membership tier", "\u4f1a\u5458"])) {
    sourceKinds.add("subscription");
  }

  if (includesSourceToken(normalized, ["wallet", "\u94b1\u5305"])) {
    sourceKinds.add("wallet-recharge");
  }

  if (includesSourceToken(normalized, ["points", "point", "\u79ef\u5206"])) {
    sourceKinds.add("points-recharge");
  }

  if (includesSourceToken(normalized, ["offer", "bundle", "\u7ec4\u5408", "\u5957\u9910"])) {
    sourceKinds.add("offer-bundle");
  }

  if (sourceKinds.size === 0 && includesSourceToken(normalized, ["recharge", "\u5145\u503c"])) {
    sourceKinds.add("wallet-recharge");
    sourceKinds.add("points-recharge");
  }

  return Array.from(sourceKinds);
}

function resolveCouponSourceKinds(coupon: {
  id: string;
  label: string;
  scopeType?: string;
  scopeValue?: string;
}): SdkworkCheckoutSourceKind[] {
  const explicitSourceKinds = [
    ...mapCouponScopeTokenToSourceKinds(coupon.scopeType),
    ...mapCouponScopeTokenToSourceKinds(coupon.scopeValue),
  ];

  if (explicitSourceKinds.length > 0) {
    return Array.from(new Set(explicitSourceKinds));
  }

  return normalizeCouponSourceKinds(coupon);
}

function mapCoupon(coupon: {
  amountCny?: number | null;
  id: string;
  minimumSpendCny?: number | null;
  name: string;
  scopeType?: string;
  scopeValue?: string;
}): SdkworkCheckoutCoupon {
  return {
    discountAmountCny: roundCurrency(toSafeNumber(coupon.amountCny)),
    id: coupon.id,
    label: coupon.name,
    minimumSpendCny: coupon.minimumSpendCny ?? null,
    sourceKinds: resolveCouponSourceKinds({
      id: coupon.id,
      label: coupon.name,
      scopeType: coupon.scopeType,
      scopeValue: coupon.scopeValue,
    }),
  };
}

function mapPaymentMethod(
  method: SdkworkPaymentMethod,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutPaymentMethod {
  const kind = method.code.includes("PAY") ? "qr" : "other";

  return {
    available: method.available,
    code: method.code,
    description: kind === "qr" ? copy.paymentMethodScanDescription : undefined,
    id: method.id,
    kind,
    label: method.label,
    recommended: method.sort <= 1,
  };
}

function parseRouteParams(route: string): URLSearchParams {
  try {
    return new URL(route, "https://sdkwork.local").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function mapMembershipPlanSource(
  plan: SdkworkMembershipPlan,
  action: SdkworkSubscriptionAction,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutSource {
  const billingLabel = (plan.durationDays ?? 0) >= 300
    ? copy.subscriptionBillingAnnual
    : copy.subscriptionBillingMonthly;

  return {
    action: createSdkworkCommercialAction({
      capability: "subscription",
      intent: action,
      label: copy.subscriptionBillingMonthly,
      route: `/memberships?packageId=${plan.packageId}&mode=${action}`,
    }),
    billingLabel,
    description: plan.description || plan.name,
    id: createMembershipCheckoutSourceId(plan, action),
    invoiceEligible: true,
    kind: "subscription",
    meta: {
      action,
      packageId: plan.packageId,
    },
    originalAmountCny: toSafeNumber(plan.priceCny),
    quantity: 1,
    recommended: plan.recommended && action === "purchase",
    tags: [...plan.tags],
    title: plan.name,
    unitLabel: copy.sourceUnitSeat,
  };
}

function mapSubscriptionSource(
  plan: SdkworkPricingPlan,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutSource {
  const routeParams = parseRouteParams(plan.action.route);
  const action = (plan.action.intent || routeParams.get("mode") || "purchase") as SdkworkSubscriptionAction;
  const rawPackId = routeParams.get("packageId");
  const packageId = rawPackId && /^\d+$/.test(rawPackId) ? Number(rawPackId) : undefined;

  return {
    action: plan.action,
    billingLabel: plan.cadence === "annual" ? copy.subscriptionBillingAnnual : copy.subscriptionBillingMonthly,
    description: plan.description,
    id: plan.id,
    invoiceEligible: true,
    kind: "subscription",
    meta: {
      action,
      packageId,
    },
    originalAmountCny: toSafeNumber(plan.priceCny),
    quantity: Math.max(1, toSafeNumber(plan.seatLimit) || 1),
    recommended: plan.recommended,
    tags: [...plan.tags],
    title: plan.title,
    unitLabel: copy.sourceUnitSeat,
  };
}

function mapWalletRechargePackageSource(
  rechargePackage: SdkworkWalletRechargePackage,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutSource {
  return {
    action: createSdkworkCommercialAction({
      capability: "wallet",
      intent: "recharge",
      label: copy.walletActionLabel,
      route: `/wallet?section=recharge&packageId=${rechargePackage.id}`,
    }),
    billingLabel: copy.walletBillingLabel,
    description: rechargePackage.description || rechargePackage.title,
    id: createWalletCheckoutSourceId({ packageId: rechargePackage.id }),
    invoiceEligible: false,
    kind: "wallet-recharge",
    meta: {
      packageId: rechargePackage.id,
      points: rechargePackage.points,
      rechargePackageId: rechargePackage.id,
    },
    originalAmountCny: toSafeNumber(rechargePackage.priceCny),
    quantity: rechargePackage.points,
    recommended: rechargePackage.recommended,
    tags: ["wallet", "recharge"],
    title: rechargePackage.title,
    unitLabel: copy.sourceUnitPoints,
  };
}

function mapWalletRechargePointsSource(
  points: number,
  priceCny: number,
  copy: SdkworkCheckoutServiceCopy,
  packageId?: number,
): SdkworkCheckoutSource {
  return {
    action: createSdkworkCommercialAction({
      capability: "wallet",
      intent: "recharge",
      label: copy.walletActionLabel,
      route: `/wallet?section=recharge&points=${points}`,
    }),
    billingLabel: copy.walletBillingLabel,
    description: copy.walletCustomRechargeDescription,
    id: createWalletCheckoutSourceId({ points }),
    invoiceEligible: false,
    kind: "wallet-recharge",
    meta: {
      ...(packageId ? { packageId, rechargePackageId: packageId } : {}),
      points,
    },
    originalAmountCny: toSafeNumber(priceCny),
    quantity: points,
    recommended: false,
    tags: ["wallet", "recharge", "custom"],
    title: copy.walletCustomRechargeTitle,
    unitLabel: copy.sourceUnitPoints,
  };
}

function mapWalletRechargeSource(
  plan: SdkworkPricingPlan,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutSource {
  return {
    action: plan.action,
    billingLabel: copy.walletBillingLabel,
    description: plan.description,
    id: plan.id,
    invoiceEligible: false,
    kind: "wallet-recharge",
    meta: {
      points: plan.includedPoints,
    },
    originalAmountCny: toSafeNumber(plan.priceCny),
    quantity: plan.includedPoints,
    recommended: plan.recommended,
    tags: [...plan.tags],
    title: plan.title,
    unitLabel: copy.sourceUnitPoints,
  };
}

function mapPointsRechargeSource(
  offer: SdkworkPointsRechargeOffer,
  copy: SdkworkCheckoutServiceCopy,
): SdkworkCheckoutSource {
  return {
    action: createSdkworkCommercialAction({
      capability: "points",
      intent: "recharge",
      label: copy.pointsActionLabel,
      route: "/points?section=recharge",
    }),
    billingLabel: copy.pointsBillingLabel,
    description: offer.description || copy.pointsDescriptionFallback,
    id: offer.id,
    invoiceEligible: false,
    kind: "points-recharge",
    meta: {
      points: offer.points,
    },
    originalAmountCny: toSafeNumber(offer.priceCny),
    quantity: offer.points,
    recommended: offer.recommended,
    tags: ["points"],
    title: offer.title,
    unitLabel: copy.sourceUnitPoints,
  };
}

function mapOfferSource(offer: {
  action?: SdkworkCommercialAction;
  description?: string;
  id: string;
  priceCny?: number | null;
  recommended: boolean;
  tags: string[];
  title: string;
}, copy: SdkworkCheckoutServiceCopy): SdkworkCheckoutSource | null {
  if (toSafeNumber(offer.priceCny) <= 0) {
    return null;
  }

  return {
    action: offer.action ?? createSdkworkCommercialAction({
      capability: "offer",
      intent: "review",
      label: copy.offerActionLabel,
      route: "/offers",
    }),
    billingLabel: copy.offerBillingLabel,
    description: offer.description || copy.offerDescriptionFallback,
    id: offer.id,
    invoiceEligible: true,
    kind: "offer-bundle",
    meta: {},
    originalAmountCny: toSafeNumber(offer.priceCny),
    quantity: 1,
    recommended: offer.recommended,
    tags: [...offer.tags],
    title: offer.title,
    unitLabel: copy.sourceUnitBundle,
  };
}

function dedupeSources(sources: readonly SdkworkCheckoutSource[]): SdkworkCheckoutSource[] {
  const byId = new Map<string, SdkworkCheckoutSource>();
  sources.forEach((source) => {
    if (!byId.has(source.id)) {
      byId.set(source.id, source);
    }
  });
  return Array.from(byId.values());
}

function mapSubscriptionPaymentMethod(
  paymentMethodCode: string | undefined,
): "ALIPAY" | "WECHAT" | undefined {
  if (paymentMethodCode === "ALIPAY") {
    return "ALIPAY";
  }

  if (paymentMethodCode === "WECHAT_PAY") {
    return "WECHAT";
  }

  return undefined;
}

function toSubmitStatus(status: string | undefined): "completed" | "failed" | "pending" {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "completed" || normalized === "success") {
    return "completed";
  }

  if (
    normalized === "failed"
    || normalized === "error"
    || normalized === "cancelled"
    || normalized === "canceled"
    || normalized === "closed"
    || normalized === "expired"
  ) {
    return "failed";
  }

  return "pending";
}

function requireMethod<T extends Function | undefined>(
  method: T,
  name: string,
): Exclude<T, undefined> {
  if (!method) {
    throw new Error(`${name} is unavailable on the current checkout service.`);
  }

  return method as Exclude<T, undefined>;
}

function mapPaymentResultToRoute(payment: SdkworkPaymentDetail): string {
  return createPaymentRouteIntent({
    orderId: payment.orderId,
    paymentId: payment.id,
  }).route;
}

function requiresSelectedPaymentMethod(payableAmountCny: number): boolean {
  return payableAmountCny > 0;
}

async function createRequestedInvoice(
  enabled: boolean,
  amountCny: number | null | undefined,
  invoiceService: SdkworkInvoiceService,
  invoicePolicy: SdkworkCheckoutCatalogData["invoicePolicy"],
  copy: SdkworkCheckoutServiceCopy,
): Promise<string | undefined> {
  if (!enabled) {
    return undefined;
  }

  const invoice = await invoiceService.createInvoice({
    title: invoicePolicy.title || copy.invoiceTitle,
    titleType: invoicePolicy.titleType,
    totalAmountCny: toSafeNumber(amountCny),
    type: "electronic",
  });

  return invoice.id;
}

export function buildSdkworkCheckoutWalletRechargeSource(input: {
  locale?: string | null;
  messages?: SdkworkCheckoutMessagesOverrides;
  packageId?: number;
  points: number;
  priceCny: number;
}): SdkworkCheckoutSource {
  const copy = createSdkworkCheckoutMessages(input.locale, input.messages).service;
  return mapWalletRechargePointsSource(input.points, input.priceCny, copy, input.packageId);
}

export function createSdkworkCheckoutService(
  options: CreateSdkworkCheckoutServiceOptions = {},
): SdkworkCheckoutService {
  const messages = createSdkworkCheckoutMessages(options.locale, options.messages);
  const copy = messages.service;
  const childServiceOptions = {
    commerceService: options.commerceService,
    locale: options.locale,
  };
  const pricingService = {
    ...createSdkworkPricingService(childServiceOptions),
    ...options.pricingService,
  };
  const couponService = {
    ...createSdkworkCouponService(childServiceOptions),
    ...options.couponService,
  };
  const invoiceService = {
    ...createSdkworkInvoiceService(childServiceOptions),
    ...options.invoiceService,
  };
  const offerService = {
    ...createSdkworkOfferService(childServiceOptions),
    ...options.offerService,
  };
  const orderService = {
    ...createSdkworkOrderService(childServiceOptions),
    ...options.orderService,
  };
  const paymentService = {
    ...createSdkworkPaymentService(childServiceOptions),
    ...options.paymentService,
  };
  const pointsService = {
    ...createSdkworkPointsService({
      commerceService: options.commerceService,
    }),
    ...options.pointsService,
  };
  const subscriptionService = {
    ...createSdkworkSubscriptionService(childServiceOptions),
    ...options.subscriptionService,
  };
  const walletService = {
    ...createSdkworkWalletService({
      commerceService: options.commerceService,
    }),
    ...options.walletService,
  };
  const membershipService = {
    ...createSdkworkMembershipService(childServiceOptions),
    ...options.membershipService,
  };

  return {
    getEmptyCatalog() {
      return createEmptySdkworkCheckoutCatalog();
    },

    async getCatalog() {
      const [
        pricingCatalog,
        pointsDashboard,
        couponDashboard,
        paymentDashboard,
        walletOverview,
        offerDashboard,
        membershipDashboard,
      ] = await Promise.all([
        pricingService.getCatalog(),
        pointsService.getDashboard(),
        couponService.getDashboard(),
        paymentService.getDashboard(),
        walletService.getOverview(),
        offerService.getDashboard(),
        membershipService.getDashboard(),
      ]);

      const subscriptionSources = pricingCatalog.plans
        .filter((plan) => plan.billingModel === "subscription")
        .map((plan) => mapSubscriptionSource(plan, copy));
      const walletRechargeSources = pricingCatalog.plans
        .filter((plan) => plan.billingModel === "prepaid")
        .map((plan) => mapWalletRechargeSource(plan, copy));
      const pointsRechargeSources = pointsDashboard.rechargeOffers.map((offer) => mapPointsRechargeSource(offer, copy));
      const offerSources = offerDashboard.featuredOffers
        .map((offer) => mapOfferSource(offer, copy))
        .filter((source): source is SdkworkCheckoutSource => Boolean(source));
      const membershipSources = membershipDashboard.plans.flatMap((plan) => (
        (["purchase", "renew", "upgrade"] as const).map((action) => mapMembershipPlanSource(plan, action, copy))
      ));
      const walletPackageSources = walletOverview.rechargePackages.map((rechargePackage) => (
        mapWalletRechargePackageSource(rechargePackage, copy)
      ));

      return {
        invoicePolicy: {
          available:
            pricingCatalog.summary.isAuthenticated
            || pointsDashboard.summary.isAuthenticated
            || walletOverview.isAuthenticated
            || offerDashboard.inventory.isAuthenticated,
          enabledByDefault:
            pricingCatalog.summary.isAuthenticated
            || pointsDashboard.summary.isAuthenticated
            || walletOverview.isAuthenticated
            || offerDashboard.inventory.isAuthenticated,
          title: copy.invoiceTitle,
          titleType: "company",
        },
        isAuthenticated:
          pricingCatalog.summary.isAuthenticated
          || pointsDashboard.summary.isAuthenticated
          || walletOverview.isAuthenticated
          || offerDashboard.inventory.isAuthenticated
          || membershipDashboard.summary.isAuthenticated,
        paymentMethods: paymentDashboard.methods.map((method) => mapPaymentMethod(method, copy)),
        sources: dedupeSources([
          ...subscriptionSources,
          ...membershipSources,
          ...walletPackageSources,
          ...walletRechargeSources,
          ...pointsRechargeSources,
          ...offerSources,
        ]),
        userCoupons: couponDashboard.availableCoupons.map(mapCoupon),
        walletBalanceCny: roundCurrency(
          toSafeNumber(walletOverview.account.cashAvailable || pricingCatalog.summary.walletBalanceCny),
        ),
      };
    },

    async submitCheckout(input) {
      const catalog = await this.getCatalog();
      const session = buildSdkworkCheckoutSession({
        catalog,
        invoiceRequested: input.invoiceRequested,
        selectedCouponId: input.selectedCouponId,
        selectedPaymentMethodId: input.selectedPaymentMethodId,
        selectedSourceId: input.sourceId,
      });
      const source = session.source;

      if (!source) {
        throw new Error(copy.noCheckoutSourceAvailable);
      }

      const selectedPaymentMethod = catalog.paymentMethods.find(
        (method) => method.id === session.selectedPaymentMethodId,
      );
      const selectedPaymentMethodCode = selectedPaymentMethod?.code;

      if (requiresSelectedPaymentMethod(session.summary.payableAmountCny) && !selectedPaymentMethodCode) {
        throw new Error(copy.paymentMethodRequired);
      }

      if (source.kind === "subscription") {
        const action = String(source.meta?.action || "purchase") as SdkworkSubscriptionAction;
        const packageId = Number(source.meta?.packageId);
        if (!Number.isInteger(packageId) || packageId <= 0) {
          throw new Error(copy.subscriptionPackIdMissing);
        }
        const mutationInput = {
          couponId: session.selectedCouponId ?? undefined,
          packageId,
          paymentMethod: mapSubscriptionPaymentMethod(selectedPaymentMethodCode),
        };
        const mutation =
          action === "renew"
            ? requireMethod(subscriptionService.renewSubscription, "subscription.renewSubscription")
            : action === "upgrade"
              ? requireMethod(subscriptionService.upgradeSubscription, "subscription.upgradeSubscription")
              : requireMethod(subscriptionService.purchaseSubscription, "subscription.purchaseSubscription");
        const result = await mutation(mutationInput);

        let paymentId: string | undefined;
        let nextRoute = createOrderRouteIntent({
          orderId: result.orderId,
        }).route;
        let qrContent: string | undefined;
        let qrImage: SdkworkMediaResource | undefined;

        if (result.orderId && selectedPaymentMethodCode) {
          const payment = await paymentService.createPayment({
            amountCny: session.summary.payableAmountCny,
            businessType: "subscription",
            orderId: result.orderId,
            paymentMethod: selectedPaymentMethodCode,
          });
          paymentId = payment.id;
          qrContent = payment.qrContent;
          qrImage = payment.qrImage;
          nextRoute = mapPaymentResultToRoute(payment);
        }

        const resolvedStatus = paymentId ? "requires-payment" : toSubmitStatus(result.status);
        const invoiceId = await createRequestedInvoice(
          resolvedStatus !== "failed" && session.invoiceRequested && session.summary.invoiceEligible,
          session.summary.payableAmountCny,
          invoiceService,
          catalog.invoicePolicy,
          copy,
        );

        return {
          amountCny: session.summary.payableAmountCny,
          ...(invoiceId ? { invoiceId } : {}),
          ...(resolvedStatus !== "failed" ? { nextRoute } : {}),
          ...(result.orderId ? { orderId: result.orderId } : {}),
          ...(paymentId ? { paymentId } : {}),
          ...(qrContent ? { qrContent } : {}),
          ...(qrImage ? { qrImage } : {}),
          status: resolvedStatus,
        };
      }

      if (source.kind === "wallet-recharge") {
        const result = await requireMethod(walletService.rechargePoints, "wallet.rechargePoints")({
          paymentMethod: selectedPaymentMethodCode,
          points: Number(source.meta?.points || source.quantity),
        });
        const resolvedStatus = toSubmitStatus(result.status);
        const invoiceId = await createRequestedInvoice(
          resolvedStatus !== "failed" && session.invoiceRequested && session.summary.invoiceEligible,
          result.cashAmountCny,
          invoiceService,
          catalog.invoicePolicy,
          copy,
        );

        return {
          amountCny: result.cashAmountCny,
          ...(invoiceId ? { invoiceId } : {}),
          ...(resolvedStatus !== "failed" ? { nextRoute: source.action.route } : {}),
          status: resolvedStatus,
        };
      }

      if (source.kind === "points-recharge") {
        const result = await requireMethod(pointsService.rechargePoints, "points.rechargePoints")({
          paymentMethod: selectedPaymentMethodCode!,
          points: Number(source.meta?.points || source.quantity),
        });
        const resolvedStatus = toSubmitStatus(result.status);
        const invoiceId = await createRequestedInvoice(
          resolvedStatus !== "failed" && session.invoiceRequested && session.summary.invoiceEligible,
          result.cashAmountCny,
          invoiceService,
          catalog.invoicePolicy,
          copy,
        );

        return {
          amountCny: result.cashAmountCny,
          ...(invoiceId ? { invoiceId } : {}),
          ...(resolvedStatus !== "failed" ? { nextRoute: source.action.route } : {}),
          status: resolvedStatus,
        };
      }

      if (source.meta?.orderId && selectedPaymentMethodCode && orderService.payOrder) {
        const result = await orderService.payOrder({
          orderId: String(source.meta.orderId),
          paymentMethod: selectedPaymentMethodCode,
        });
        const resolvedStatus = result.paymentId ? "requires-payment" : "pending";
        const invoiceId = await createRequestedInvoice(
          session.invoiceRequested && session.summary.invoiceEligible,
          result.amountCny ?? session.summary.payableAmountCny,
          invoiceService,
          catalog.invoicePolicy,
          copy,
        );

        return {
          amountCny: result.amountCny,
          ...(invoiceId ? { invoiceId } : {}),
          nextRoute: result.paymentId
            ? createPaymentRouteIntent({
                orderId: result.orderId,
                paymentId: result.paymentId,
              }).route
            : source.action.route,
          orderId: result.orderId,
          ...(result.paymentId ? { paymentId: result.paymentId } : {}),
          status: resolvedStatus,
        };
      }

      const invoiceId = await createRequestedInvoice(
        session.invoiceRequested && session.summary.invoiceEligible,
        session.summary.payableAmountCny,
        invoiceService,
        catalog.invoicePolicy,
        copy,
      );

      return {
        amountCny: session.summary.payableAmountCny,
        ...(invoiceId ? { invoiceId } : {}),
        nextRoute: source.action.route,
        status: "pending",
      };
    },
  };
}

export const sdkworkCheckoutService = createSdkworkCheckoutService();
