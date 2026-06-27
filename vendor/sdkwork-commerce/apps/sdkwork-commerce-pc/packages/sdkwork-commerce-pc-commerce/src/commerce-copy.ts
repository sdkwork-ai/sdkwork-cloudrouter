export type SdkworkCommerceLocale = "en-US" | "zh-CN";

export type SdkworkCommerceMessagesOverrides = DeepPartial<SdkworkCommerceMessages>;

export interface SdkworkCommerceMessages {
  activity: {
    couponsEmpty: string;
    couponsEyebrow: string;
    couponsTitle: string;
    invoicesEmpty: string;
    invoicesEyebrow: string;
    invoicesTitle: string;
    ordersEmpty: string;
    ordersEyebrow: string;
    ordersTitle: string;
    paymentsEmpty: string;
    paymentsEyebrow: string;
    paymentsTitle: string;
    transactionsEmpty: string;
    transactionsEyebrow: string;
    transactionsTitle: string;
    unknownPayment: string;
  };
  analyticsSummary: {
    activeAlerts: string;
    averageOrderValue: string;
    eyebrow: string;
    title: string;
    totalRevenue: string;
    totalRevenueRecordsValue: string;
    totalSuccessfulOrders: string;
  };
  common: {
    actionRequiredValue: string;
    authenticated: string;
    claimableExpiringValue: string;
    daysValue: string;
    guest: string;
    includesPointsValue: string;
    noActiveTerm: string;
    orderCountValue: string;
    ordersAovValue: string;
    pendingIssuanceValue: string;
    savingsValue: string;
    shareValue: string;
    trendValue: string;
  };
  featuredOffers: {
    descriptionFallback: string;
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    featured: string;
    title: string;
  };
  hero: {
    accountState: string;
    actionablePayments: string;
    availableCoupons: string;
    availablePoints: string;
    bestOfferSavings: string;
    claimedBenefits: string;
    currentLevel: string;
    description: string;
    eyebrow: string;
    featuredOffers: string;
    invoiceQueue: string;
    paymentMethods: string;
    title: string;
    totalOrders: string;
    membershipSpending: string;
    membershipTerm: string;
  };
  page: {
    errorTitle: string;
    loading: string;
  };
  revenue: {
    analyticsEyebrow: string;
    chartAria: string;
    emptyTrend: string;
    productEmpty: string;
    productMixEyebrow: string;
    productMixTitle: string;
    title: string;
  };
  service: {
    authRequiredDescription: string;
    authRequiredMetric: string;
    authRequiredTitle: string;
    commercialOrderFallback: string;
    invoiceActionRequiredDescriptionValue: string;
    invoiceActionRequiredMetricValue: string;
    invoiceActionRequiredTitle: string;
    paymentCoverageDescription: string;
    paymentCoverageMetricValue: string;
    paymentCoverageTitle: string;
    pendingPaymentDescriptionValue: string;
    pendingPaymentMetricValue: string;
    pendingPaymentTitle: string;
  };
  workbench: {
    alertsEmpty: string;
    alertsTitle: string;
    eyebrow: string;
    productEmpty: string;
    productTitle: string;
    revenueRecordsEmpty: string;
    revenueRecordsTitle: string;
    title: string;
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

function interpolateTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    template,
  );
}

const EN_US_MESSAGES: SdkworkCommerceMessages = {
  activity: {
    couponsEmpty: "No coupons have been synced yet.",
    couponsEyebrow: "Coupons",
    couponsTitle: "Recent discount inventory",
    invoicesEmpty: "No invoice records have been synced yet.",
    invoicesEyebrow: "Invoices",
    invoicesTitle: "Recent invoice pipeline",
    ordersEmpty: "No billing orders recorded yet.",
    ordersEyebrow: "Orders",
    ordersTitle: "Recent billing orders",
    paymentsEmpty: "No payment attempts have been synced yet.",
    paymentsEyebrow: "Payments",
    paymentsTitle: "Recent payment attempts",
    transactionsEmpty: "No point activity recorded yet.",
    transactionsEyebrow: "Transactions",
    transactionsTitle: "Recent point activity",
    unknownPayment: "Payment",
  },
  analyticsSummary: {
    activeAlerts: "Active alerts",
    averageOrderValue: "Average order value",
    eyebrow: "Revenue command",
    title: "Commercial operating posture",
    totalRevenue: "Total revenue",
    totalRevenueRecordsValue: "{value} tracked orders across the current business window",
    totalSuccessfulOrders: "Successful orders",
  },
  common: {
    actionRequiredValue: "{value} action required",
    authenticated: "Authenticated",
    claimableExpiringValue: "{claimable} claimable / {expiring} expiring soon",
    daysValue: "{value} days",
    guest: "Guest",
    includesPointsValue: "Includes {value} points",
    noActiveTerm: "No active term",
    orderCountValue: "{value} orders",
    ordersAovValue: "{orders} orders / AOV {value}",
    pendingIssuanceValue: "{value} pending issuance",
    savingsValue: "Savings {value}",
    shareValue: "{value}% share",
    trendValue: "{value}% trend",
  },
  featuredOffers: {
    descriptionFallback: "Commercial offer package",
    emptyDescription: "No featured offers are currently available.",
    emptyTitle: "No featured offers",
    eyebrow: "Recommended",
    featured: "Featured",
    title: "Featured offers",
  },
  hero: {
    accountState: "Account state",
    actionablePayments: "Actionable payments",
    availableCoupons: "Available coupons",
    availablePoints: "Available points",
    bestOfferSavings: "Best offer savings",
    claimedBenefits: "Claimed benefits",
    currentLevel: "Level",
    description: "Unify wallet balance, membership growth, point spending, invoice lifecycle, payment attempts, and pending orders into one reusable Sdkwork-style business console.",
    eyebrow: "Commercial System",
    featuredOffers: "Featured offers",
    invoiceQueue: "Invoice queue",
    paymentMethods: "Payment methods",
    title: "Commerce Hub",
    totalOrders: "Total orders",
    membershipSpending: "Membership spending",
    membershipTerm: "Membership term",
  },
  page: {
    errorTitle: "Commerce hub error",
    loading: "Loading commerce hub...",
  },
  revenue: {
    analyticsEyebrow: "Analytics",
    chartAria: "Revenue trend chart",
    emptyTrend: "No revenue trend data has been derived yet.",
    productEmpty: "Product revenue share will appear after commercial transactions complete.",
    productMixEyebrow: "Product mix",
    productMixTitle: "Product revenue share",
    title: "Revenue trend",
  },
  service: {
    authRequiredDescription: "Commerce data is limited until the operator session is authenticated.",
    authRequiredMetric: "guest",
    authRequiredTitle: "Authentication required",
    commercialOrderFallback: "Commercial order",
    invoiceActionRequiredDescriptionValue: "{value} invoice records require manual processing.",
    invoiceActionRequiredMetricValue: "{value} invoice",
    invoiceActionRequiredTitle: "Invoice action required",
    paymentCoverageDescription: "Only one payment method is available, which reduces checkout resilience.",
    paymentCoverageMetricValue: "{value} method",
    paymentCoverageTitle: "Payment method coverage is thin",
    pendingPaymentDescriptionValue: "{value} payment attempts still need completion.",
    pendingPaymentMetricValue: "{value} pending",
    pendingPaymentTitle: "Pending payment follow-up",
  },
  workbench: {
    alertsEmpty: "No operator alerts are currently active.",
    alertsTitle: "Operator alerts",
    eyebrow: "Business operations",
    productEmpty: "Product performance data is not available yet.",
    productTitle: "Product performance",
    revenueRecordsEmpty: "No successful revenue records have been derived yet.",
    revenueRecordsTitle: "Recent revenue records",
    title: "Analytics workbench",
  },
};

const ZH_CN_MESSAGES: SdkworkCommerceMessages = {
  activity: {
    couponsEmpty: "\u6682\u65e0\u540c\u6b65\u4f18\u60e0\u5238\u6570\u636e\u3002",
    couponsEyebrow: "\u4f18\u60e0\u5238",
    couponsTitle: "\u6700\u8fd1\u6298\u6263\u5e93\u5b58",
    invoicesEmpty: "\u6682\u65e0\u540c\u6b65\u53d1\u7968\u8bb0\u5f55\u3002",
    invoicesEyebrow: "\u53d1\u7968",
    invoicesTitle: "\u6700\u8fd1\u53d1\u7968\u6d41\u7a0b",
    ordersEmpty: "\u6682\u65e0\u8ba1\u8d39\u8ba2\u5355\u8bb0\u5f55\u3002",
    ordersEyebrow: "\u8ba2\u5355",
    ordersTitle: "\u6700\u8fd1\u8ba1\u8d39\u8ba2\u5355",
    paymentsEmpty: "\u6682\u65e0\u540c\u6b65\u652f\u4ed8\u5c1d\u8bd5\u8bb0\u5f55\u3002",
    paymentsEyebrow: "\u652f\u4ed8",
    paymentsTitle: "\u6700\u8fd1\u652f\u4ed8\u5c1d\u8bd5",
    transactionsEmpty: "\u6682\u65e0\u79ef\u5206\u6d3b\u52a8\u8bb0\u5f55\u3002",
    transactionsEyebrow: "\u4ea4\u6613",
    transactionsTitle: "\u6700\u8fd1\u79ef\u5206\u6d3b\u52a8",
    unknownPayment: "\u652f\u4ed8",
  },
  analyticsSummary: {
    activeAlerts: "\u6d3b\u8dc3\u544a\u8b66",
    averageOrderValue: "\u5e73\u5747\u5ba2\u5355\u4ef7",
    eyebrow: "\u6536\u5165\u6307\u6325\u53f0",
    title: "\u5546\u4e1a\u5316\u7ecf\u8425\u6001\u52bf",
    totalRevenue: "\u603b\u6536\u5165",
    totalRevenueRecordsValue: "\u5f53\u524d\u5546\u4e1a\u5316\u7a97\u53e3\u5df2\u8ddf\u8e2a {value} \u7b14\u8ba2\u5355",
    totalSuccessfulOrders: "\u6210\u529f\u8ba2\u5355",
  },
  common: {
    actionRequiredValue: "{value} \u9879\u5f85\u5904\u7406",
    authenticated: "\u5df2\u8ba4\u8bc1",
    claimableExpiringValue: "{claimable} \u5f20\u53ef\u9886\u53d6 / {expiring} \u5f20\u5373\u5c06\u8fc7\u671f",
    daysValue: "{value} \u5929",
    guest: "\u6e38\u5ba2",
    includesPointsValue: "\u5305\u542b {value} \u79ef\u5206",
    noActiveTerm: "\u6682\u65e0\u751f\u6548\u671f",
    orderCountValue: "{value} \u7b14\u8ba2\u5355",
    ordersAovValue: "{orders} \u7b14\u8ba2\u5355 / \u5ba2\u5355\u4ef7 {value}",
    pendingIssuanceValue: "{value} \u7b14\u5f85\u5f00\u5177",
    savingsValue: "\u8282\u7701 {value}",
    shareValue: "\u5360\u6bd4 {value}%",
    trendValue: "\u8d8b\u52bf {value}%",
  },
  featuredOffers: {
    descriptionFallback: "\u5546\u4e1a\u5316\u65b9\u6848\u5957\u9910",
    emptyDescription: "\u5f53\u524d\u6682\u65e0\u53ef\u7528\u7684\u7cbe\u9009\u65b9\u6848\u3002",
    emptyTitle: "\u6682\u65e0\u7cbe\u9009\u65b9\u6848",
    eyebrow: "\u63a8\u8350",
    featured: "\u7cbe\u9009",
    title: "\u7cbe\u9009\u65b9\u6848",
  },
  hero: {
    accountState: "\u8d26\u6237\u72b6\u6001",
    actionablePayments: "\u5f85\u8ddf\u8fdb\u652f\u4ed8",
    availableCoupons: "\u53ef\u7528\u4f18\u60e0\u5238",
    availablePoints: "\u53ef\u7528\u79ef\u5206",
    bestOfferSavings: "\u6700\u4f73\u65b9\u6848\u8282\u7701",
    claimedBenefits: "\u5df2\u9886\u53d6\u6743\u76ca",
    currentLevel: "\u7b49\u7ea7",
    description: "\u628a\u94b1\u5305\u4f59\u989d\u3001\u4f1a\u5458\u6210\u957f\u3001\u79ef\u5206\u6d88\u8017\u3001\u53d1\u7968\u751f\u547d\u5468\u671f\u3001\u652f\u4ed8\u5c1d\u8bd5\u548c\u5f85\u5904\u7406\u8ba2\u5355\u7edf\u4e00\u5728\u4e00\u5957 Sdkwork \u98ce\u683c\u7684\u5546\u4e1a\u5316\u63a7\u5236\u53f0\u4e2d\u3002",
    eyebrow: "\u5546\u4e1a\u7cfb\u7edf",
    featuredOffers: "\u7cbe\u9009\u65b9\u6848",
    invoiceQueue: "\u53d1\u7968\u961f\u5217",
    paymentMethods: "\u652f\u4ed8\u65b9\u5f0f",
    title: "\u5546\u4e1a\u4e2d\u67a2",
    totalOrders: "\u8ba2\u5355\u603b\u6570",
    membershipSpending: "\u4f1a\u5458\u652f\u51fa",
    membershipTerm: "\u4f1a\u5458\u671f\u9650",
  },
  page: {
    errorTitle: "\u5546\u4e1a\u4e2d\u67a2\u5f02\u5e38",
    loading: "\u6b63\u5728\u52a0\u8f7d\u5546\u4e1a\u4e2d\u67a2...",
  },
  revenue: {
    analyticsEyebrow: "\u5206\u6790",
    chartAria: "\u6536\u5165\u8d8b\u52bf\u56fe",
    emptyTrend: "\u6682\u65e0\u751f\u6210\u6536\u5165\u8d8b\u52bf\u6570\u636e\u3002",
    productEmpty: "\u5546\u4e1a\u5316\u4ea4\u6613\u5b8c\u6210\u540e\u5c06\u663e\u793a\u4ea7\u54c1\u6536\u5165\u5206\u5e03\u3002",
    productMixEyebrow: "\u4ea7\u54c1\u7ed3\u6784",
    productMixTitle: "\u4ea7\u54c1\u6536\u5165\u5360\u6bd4",
    title: "\u6536\u5165\u8d8b\u52bf",
  },
  service: {
    authRequiredDescription: "\u5b8c\u6210\u8fd0\u8425\u767b\u5f55\u540e\u624d\u80fd\u67e5\u770b\u5b8c\u6574\u7684\u5546\u4e1a\u5316\u6570\u636e\u3002",
    authRequiredMetric: "\u6e38\u5ba2",
    authRequiredTitle: "\u9700\u8981\u8ba4\u8bc1",
    commercialOrderFallback: "\u5546\u4e1a\u5316\u8ba2\u5355",
    invoiceActionRequiredDescriptionValue: "{value} \u6761\u53d1\u7968\u8bb0\u5f55\u9700\u8981\u4eba\u5de5\u5904\u7406\u3002",
    invoiceActionRequiredMetricValue: "{value} \u5f20\u53d1\u7968",
    invoiceActionRequiredTitle: "\u53d1\u7968\u5f85\u5904\u7406",
    paymentCoverageDescription: "\u5f53\u524d\u4ec5\u6709\u4e00\u79cd\u652f\u4ed8\u65b9\u5f0f\u53ef\u7528\uff0c\u7ed3\u7b97\u97e7\u6027\u8f83\u5f31\u3002",
    paymentCoverageMetricValue: "{value} \u79cd\u65b9\u5f0f",
    paymentCoverageTitle: "\u652f\u4ed8\u65b9\u5f0f\u8986\u76d6\u504f\u5f31",
    pendingPaymentDescriptionValue: "\u4ecd\u6709 {value} \u7b14\u652f\u4ed8\u5c1d\u8bd5\u5f85\u5b8c\u6210\u3002",
    pendingPaymentMetricValue: "\u5f85\u5b8c\u6210 {value} \u7b14",
    pendingPaymentTitle: "\u5f85\u8ddf\u8fdb\u652f\u4ed8\u4e8b\u9879",
  },
  workbench: {
    alertsEmpty: "\u5f53\u524d\u6682\u65e0\u8fd0\u8425\u544a\u8b66\u3002",
    alertsTitle: "\u8fd0\u8425\u544a\u8b66",
    eyebrow: "\u4e1a\u52a1\u8fd0\u8425",
    productEmpty: "\u6682\u65e0\u53ef\u7528\u7684\u4ea7\u54c1\u8868\u73b0\u6570\u636e\u3002",
    productTitle: "\u4ea7\u54c1\u8868\u73b0",
    revenueRecordsEmpty: "\u6682\u65e0\u6210\u529f\u7684\u6536\u5165\u8bb0\u5f55\u3002",
    revenueRecordsTitle: "\u6700\u8fd1\u6536\u5165\u8bb0\u5f55",
    title: "\u5206\u6790\u5de5\u4f5c\u53f0",
  },
};

const SDKWORK_COMMERCE_MESSAGES: Record<SdkworkCommerceLocale, SdkworkCommerceMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkCommerceLocale(locale?: string | null): SdkworkCommerceLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkCommerceMessages(
  locale?: string | null,
  overrides?: SdkworkCommerceMessagesOverrides,
): SdkworkCommerceMessages {
  return mergeDeep(
    SDKWORK_COMMERCE_MESSAGES[normalizeSdkworkCommerceLocale(locale)],
    overrides,
  );
}

export function formatSdkworkCommerceTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return interpolateTemplate(template, replacements);
}
