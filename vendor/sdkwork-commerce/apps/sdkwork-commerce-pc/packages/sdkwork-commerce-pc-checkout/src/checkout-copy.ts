export type SdkworkCheckoutLocale = "en-US" | "zh-CN";

export type SdkworkCheckoutMessagesOverrides = DeepPartial<SdkworkCheckoutMessages>;

export interface SdkworkCheckoutMessages {
  common: {
    emptyValue: string;
    no: string;
    yes: string;
  };
  controller: {
    bootstrapFailed: string;
    noSourceSelected: string;
    submitFailed: string;
  };
  filters: {
    all: string;
    coupon: string;
    membership: string;
    recharge: string;
  };
  format: {
    couponDeductionValue: string;
    invoiceStateDisabled: string;
    invoiceStateRequested: string;
    minSpendValue: string;
    noMinimumSpend: string;
  };
  service: {
    emptyLevelName: string;
    invoiceTitle: string;
    noCheckoutSourceAvailable: string;
    offerActionLabel: string;
    offerBillingLabel: string;
    offerDescriptionFallback: string;
    paymentMethodScanDescription: string;
    paymentMethodRequired: string;
    pointsActionLabel: string;
    pointsBillingLabel: string;
    pointsDescriptionFallback: string;
    sourceUnitBundle: string;
    sourceUnitPoints: string;
    sourceUnitSeat: string;
    subscriptionBillingAnnual: string;
    subscriptionBillingMonthly: string;
    subscriptionPackIdMissing: string;
    walletActionLabel: string;
    walletBillingLabel: string;
    walletCustomRechargeDescription: string;
    walletCustomRechargeTitle: string;
  };
  page: {
    activeSourceFallback: string;
    activeSourceLabel: string;
    couponDescription: string;
    couponEmpty: string;
    couponSectionEyebrow: string;
    couponSectionTitle: string;
    description: string;
    errorTitle: string;
    eyebrow: string;
    invoicePostureLabel: string;
    loading: string;
    amountDueLabel: string;
    refresh: string;
    sourceSectionDescription: string;
    sourceSectionEmpty: string;
    sourceSectionEyebrow: string;
    sourceSectionTitle: string;
    title: string;
  };
  paymentMethods: {
    description: string;
    empty: string;
    eyebrow: string;
    recommendedBadge: string;
    selectedHint: string;
    title: string;
    unselectedHint: string;
  };
  summaryRail: {
    activeSourceEyebrow: string;
    amountDue: string;
    balanceCoverage: string;
    bannerDescription: string;
    bannerTitle: string;
    continue: string;
    coupon: string;
    couponDeduction: string;
    enableInvoice: string;
    errorTitle: string;
    invoiceRequested: string;
    noSourceDescription: string;
    noSourceTitle: string;
    originalPrice: string;
    paymentMethod: string;
    priceLabel: string;
    routeLabel: string;
    savingsLabel: string;
    signInRequiredDescription: string;
    signInRequiredTitle: string;
    summaryTitle: string;
    unselectedPaymentMethod: string;
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) {
    return base;
  }

  const output: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      continue;
    }

    const baseValue = output[key];
    output[key] = isRecord(baseValue) && isRecord(value)
      ? mergeDeep(baseValue, value)
      : value;
  }

  return output as T;
}

const EN_US_MESSAGES: SdkworkCheckoutMessages = {
  common: {
    emptyValue: "--",
    no: "No",
    yes: "Yes",
  },
  controller: {
    bootstrapFailed: "Failed to load checkout center.",
    noSourceSelected: "No checkout source is selected.",
    submitFailed: "Failed to submit checkout.",
  },
  filters: {
    all: "All",
    coupon: "Coupon",
    membership: "Membership",
    recharge: "Recharge",
  },
  format: {
    couponDeductionValue: "- {value}",
    invoiceStateDisabled: "Disabled",
    invoiceStateRequested: "Requested",
    minSpendValue: "Min spend {value}",
    noMinimumSpend: "No minimum spend",
  },
  service: {
    emptyLevelName: "Guest",
    invoiceTitle: "SDKWORK Technology",
    noCheckoutSourceAvailable: "No checkout source is available.",
    offerActionLabel: "Open curated bundle",
    offerBillingLabel: "Curated bundle",
    offerDescriptionFallback: "Curated commercial offer",
    paymentMethodScanDescription: "Scan to pay",
    paymentMethodRequired: "Select a payment method before submitting checkout.",
    pointsActionLabel: "Recharge points",
    pointsBillingLabel: "Points recharge",
    pointsDescriptionFallback: "Top up your points balance",
    sourceUnitBundle: "bundle",
    sourceUnitPoints: "points",
    sourceUnitSeat: "seat",
    subscriptionBillingAnnual: "Annual subscription",
    subscriptionBillingMonthly: "Monthly subscription",
    subscriptionPackIdMissing: "Subscription checkout source is missing a valid packageId.",
    walletActionLabel: "Recharge wallet",
    walletBillingLabel: "One-time recharge",
    walletCustomRechargeDescription: "Custom wallet recharge amount selected from the wallet workspace.",
    walletCustomRechargeTitle: "Custom wallet recharge",
  },
  page: {
    activeSourceFallback: "No source",
    activeSourceLabel: "Active source",
    couponDescription: "Only coupons that match the active source kind and minimum spend remain selectable.",
    couponEmpty: "No applicable coupons are available for the current checkout source.",
    couponSectionEyebrow: "Coupon posture",
    couponSectionTitle: "Checkout coupons",
    description: "Lock the commercial package, select the payment rail, keep coupon posture synchronized, and route cleanly into the final payment handoff.",
    errorTitle: "Checkout center error",
    eyebrow: "Transaction console",
    invoicePostureLabel: "Invoice posture",
    loading: "Loading checkout center...",
    amountDueLabel: "Amount due",
    refresh: "Refresh checkout",
    sourceSectionDescription: "Choose the exact product, recharge package, or curated bundle to finalize in checkout.",
    sourceSectionEmpty: "Checkout sources will appear after the current workspace exposes pricing and recharge packages.",
    sourceSectionEyebrow: "Source selector",
    sourceSectionTitle: "Commercial sources",
    title: "Checkout Center",
  },
  paymentMethods: {
    description: "Pick the active commercial payment rail for this transaction session.",
    empty: "Payment methods will appear when the runtime exposes a live payment contract.",
    eyebrow: "Payment method",
    recommendedBadge: "Recommended",
    selectedHint: "Currently selected",
    title: "Choose a payment method",
    unselectedHint: "Tap to use",
  },
  summaryRail: {
    activeSourceEyebrow: "Active source",
    amountDue: "Amount due",
    balanceCoverage: "Balance coverage",
    bannerDescription: "Package details, coupon posture, and payable amount stay synchronized with the active transaction source.",
    bannerTitle: "Checkout summary",
    continue: "Continue",
    coupon: "Coupon",
    couponDeduction: "Coupon deduction",
    enableInvoice: "Enable invoice",
    errorTitle: "Checkout error",
    invoiceRequested: "Invoice requested",
    noSourceDescription: "Select a pricing or recharge source to activate checkout.",
    noSourceTitle: "No checkout source",
    originalPrice: "Original price",
    paymentMethod: "Payment method",
    priceLabel: "Price",
    routeLabel: "Route",
    savingsLabel: "Estimated savings",
    signInRequiredDescription: "Checkout submission requires an authenticated runtime session.",
    signInRequiredTitle: "Sign in required",
    summaryTitle: "Checkout summary",
    unselectedPaymentMethod: "Unselected",
  },
};

const ZH_CN_MESSAGES: SdkworkCheckoutMessages = {
  common: {
    emptyValue: "--",
    no: "\u5426",
    yes: "\u662f",
  },
  controller: {
    bootstrapFailed: "\u52a0\u8f7d\u7ed3\u7b97\u4e2d\u5fc3\u5931\u8d25\u3002",
    noSourceSelected: "\u5f53\u524d\u672a\u9009\u62e9\u53ef\u7ed3\u7b97\u6765\u6e90\u3002",
    submitFailed: "\u63d0\u4ea4\u7ed3\u7b97\u5931\u8d25\u3002",
  },
  filters: {
    all: "\u5168\u90e8",
    coupon: "\u4f18\u60e0\u5238",
    membership: "\u4f1a\u5458",
    recharge: "\u5145\u503c",
  },
  format: {
    couponDeductionValue: "- {value}",
    invoiceStateDisabled: "\u672a\u5f00\u542f",
    invoiceStateRequested: "\u5df2\u7533\u8bf7",
    minSpendValue: "\u6700\u4f4e\u6d88\u8d39 {value}",
    noMinimumSpend: "\u65e0\u6700\u4f4e\u6d88\u8d39",
  },
  service: {
    emptyLevelName: "\u6e38\u5ba2",
    invoiceTitle: "SDKWORK \u79d1\u6280",
    noCheckoutSourceAvailable: "\u5f53\u524d\u6ca1\u6709\u53ef\u7528\u7684\u7ed3\u7b97\u6765\u6e90\u3002",
    offerActionLabel: "\u67e5\u770b\u7cbe\u9009\u7ec4\u5408",
    offerBillingLabel: "\u7cbe\u9009\u7ec4\u5408",
    offerDescriptionFallback: "\u7cbe\u9009\u5546\u4e1a\u5316\u65b9\u6848",
    paymentMethodScanDescription: "\u626b\u7801\u652f\u4ed8",
    paymentMethodRequired: "\u8bf7\u5148\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f\uff0c\u518d\u63d0\u4ea4\u7ed3\u7b97\u3002",
    pointsActionLabel: "\u5145\u503c\u79ef\u5206",
    pointsBillingLabel: "\u79ef\u5206\u5145\u503c",
    pointsDescriptionFallback: "\u8865\u5145\u79ef\u5206\u989d\u5ea6",
    sourceUnitBundle: "\u7ec4\u5408",
    sourceUnitPoints: "\u79ef\u5206",
    sourceUnitSeat: "\u5e2d\u4f4d",
    subscriptionBillingAnnual: "\u6309\u5e74\u8ba2\u9605",
    subscriptionBillingMonthly: "\u6309\u6708\u8ba2\u9605",
    subscriptionPackIdMissing: "\u8ba2\u9605\u7ed3\u7b97\u6765\u6e90\u7f3a\u5c11\u6709\u6548\u7684\u5957\u9910\u6807\u8bc6\u3002",
    walletActionLabel: "\u5145\u503c\u94b1\u5305",
    walletBillingLabel: "\u5355\u6b21\u5145\u503c",
    walletCustomRechargeDescription: "\u6765\u81ea\u94b1\u5305\u5de5\u4f5c\u533a\u7684\u81ea\u5b9a\u4e49\u5145\u503c\u91d1\u989d\u3002",
    walletCustomRechargeTitle: "\u81ea\u5b9a\u4e49\u94b1\u5305\u5145\u503c",
  },
  page: {
    activeSourceFallback: "\u672a\u9009\u62e9\u6765\u6e90",
    activeSourceLabel: "\u5f53\u524d\u6765\u6e90",
    couponDescription: "\u53ea\u6709\u7b26\u5408\u5f53\u524d\u6765\u6e90\u7c7b\u578b\u548c\u6700\u4f4e\u6d88\u8d39\u95e8\u69db\u7684\u4f18\u60e0\u5238\u4f1a\u4fdd\u7559\u5728\u7ed3\u7b97\u4e0a\u4e0b\u6587\u4e2d\u3002",
    couponEmpty: "\u5f53\u524d\u7ed3\u7b97\u6765\u6e90\u4e0b\u6682\u65e0\u53ef\u7528\u4f18\u60e0\u5238\u3002",
    couponSectionEyebrow: "\u4f18\u60e0\u5238\u7b56\u7565",
    couponSectionTitle: "\u7ed3\u7b97\u4f18\u60e0\u5238",
    description: "\u9501\u5b9a\u5546\u4e1a\u5316\u5546\u54c1\u3001\u9009\u62e9\u652f\u4ed8\u901a\u9053\u3001\u540c\u6b65\u4f18\u60e0\u5238\u72b6\u6001\uff0c\u5e76\u628a\u7ed3\u7b97\u5b89\u5168\u5730\u8def\u7531\u5230\u6700\u7ec8\u652f\u4ed8\u73af\u8282\u3002",
    errorTitle: "\u7ed3\u7b97\u4e2d\u5fc3\u5f02\u5e38",
    eyebrow: "\u4ea4\u6613\u63a7\u5236\u53f0",
    invoicePostureLabel: "\u53d1\u7968\u72b6\u6001",
    loading: "\u6b63\u5728\u52a0\u8f7d\u7ed3\u7b97\u4e2d\u5fc3...",
    amountDueLabel: "\u5f85\u652f\u4ed8",
    refresh: "\u5237\u65b0\u7ed3\u7b97",
    sourceSectionDescription: "\u9009\u62e9\u8981\u8fdb\u5165\u6700\u7ec8\u7ed3\u7b97\u7684\u5546\u54c1\u3001\u5145\u503c\u5305\u6216\u7cbe\u9009\u7ec4\u5408\u65b9\u6848\u3002",
    sourceSectionEmpty: "\u5f53\u524d\u5de5\u4f5c\u533a\u66b4\u9732\u51fa\u5b9a\u4ef7\u4e0e\u5145\u503c\u5305\u540e\uff0c\u8fd9\u91cc\u4f1a\u51fa\u73b0\u53ef\u7ed3\u7b97\u6765\u6e90\u3002",
    sourceSectionEyebrow: "\u6765\u6e90\u9009\u62e9",
    sourceSectionTitle: "\u5546\u4e1a\u5316\u6765\u6e90",
    title: "\u7ed3\u7b97\u4e2d\u5fc3",
  },
  paymentMethods: {
    description: "\u4e3a\u5f53\u524d\u4ea4\u6613\u4f1a\u8bdd\u9009\u62e9\u5b9e\u9645\u751f\u6548\u7684\u652f\u4ed8\u901a\u9053\u3002",
    empty: "\u5f53\u8fd0\u884c\u65f6\u66b4\u9732\u53ef\u7528\u652f\u4ed8\u534f\u8bae\u540e\uff0c\u8fd9\u91cc\u4f1a\u51fa\u73b0\u652f\u4ed8\u65b9\u5f0f\u3002",
    eyebrow: "\u652f\u4ed8\u65b9\u5f0f",
    recommendedBadge: "\u63a8\u8350",
    selectedHint: "\u5f53\u524d\u5df2\u9009",
    title: "\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f",
    unselectedHint: "\u70b9\u51fb\u4f7f\u7528",
  },
  summaryRail: {
    activeSourceEyebrow: "\u5f53\u524d\u6765\u6e90",
    amountDue: "\u5f85\u652f\u4ed8",
    balanceCoverage: "\u4f59\u989d\u62b5\u6263",
    bannerDescription: "\u5957\u9910\u4fe1\u606f\u3001\u4f18\u60e0\u5238\u72b6\u6001\u548c\u5e94\u4ed8\u91d1\u989d\u4f1a\u4e0e\u5f53\u524d\u4ea4\u6613\u6765\u6e90\u4fdd\u6301\u5b9e\u65f6\u540c\u6b65\u3002",
    bannerTitle: "\u7ed3\u7b97\u6458\u8981",
    continue: "\u7ee7\u7eed",
    coupon: "\u4f18\u60e0\u5238",
    couponDeduction: "\u4f18\u60e0\u62b5\u6263",
    enableInvoice: "\u7533\u8bf7\u53d1\u7968",
    errorTitle: "\u7ed3\u7b97\u5f02\u5e38",
    invoiceRequested: "\u5df2\u7533\u8bf7\u53d1\u7968",
    noSourceDescription: "\u9009\u62e9\u4e00\u4e2a\u5b9a\u4ef7\u65b9\u6848\u6216\u5145\u503c\u6765\u6e90\u540e\uff0c\u5373\u53ef\u6fc0\u6d3b\u7ed3\u7b97\u3002",
    noSourceTitle: "\u672a\u6fc0\u6d3b\u7ed3\u7b97\u6765\u6e90",
    originalPrice: "\u539f\u4ef7",
    paymentMethod: "\u652f\u4ed8\u65b9\u5f0f",
    priceLabel: "\u4ef7\u683c",
    routeLabel: "\u8def\u7531",
    savingsLabel: "\u9884\u8ba1\u8282\u7701",
    signInRequiredDescription: "\u63d0\u4ea4\u7ed3\u7b97\u9700\u8981\u5f53\u524d\u8fd0\u884c\u65f6\u5df2\u7ecf\u767b\u5f55\u3002",
    signInRequiredTitle: "\u9700\u8981\u5148\u767b\u5f55",
    summaryTitle: "\u7ed3\u7b97\u6458\u8981",
    unselectedPaymentMethod: "\u672a\u9009\u62e9",
  },
};

const SDKWORK_CHECKOUT_MESSAGES: Record<SdkworkCheckoutLocale, SdkworkCheckoutMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkCheckoutLocale(locale?: string | null): SdkworkCheckoutLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkCheckoutMessages(
  locale?: string | null,
  overrides?: SdkworkCheckoutMessagesOverrides,
): SdkworkCheckoutMessages {
  return mergeDeep(
    SDKWORK_CHECKOUT_MESSAGES[normalizeSdkworkCheckoutLocale(locale)],
    overrides,
  );
}
