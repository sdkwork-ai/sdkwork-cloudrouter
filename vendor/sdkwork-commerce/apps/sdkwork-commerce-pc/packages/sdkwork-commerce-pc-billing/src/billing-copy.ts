import type {
  SdkworkBillingBreakdownKey,
  SdkworkBillingPosture,
  SdkworkBillingRecommendedAction,
} from "./billing";

export type SdkworkBillingLocale = "en-US" | "zh-CN";

export type SdkworkBillingMessagesOverrides = DeepPartial<SdkworkBillingMessages>;

export interface SdkworkBillingMessages {
  actions: {
    refresh: string;
  };
  alerts: {
    budgetWatch: {
      action: string;
      description: string;
      title: string;
    };
    invoiceAttention: {
      action: string;
      description: string;
      title: string;
    };
    paymentAttention: {
      action: string;
      description: string;
      title: string;
    };
    projectedBudgetOverrun: {
      action: string;
      description: string;
      title: string;
    };
  };
  breakdown: {
    capability: string;
    costHeader: string;
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    model: string;
    provider: string;
    segmentHeader: string;
    shareHeader: string;
    title: string;
    unitsHeader: string;
    workspace: string;
  };
  cards: {
    budgetRemaining: string;
    monthSpend: string;
    outstandingAttention: string;
    posture: string;
    projectedMonth: string;
    savingsOpportunity: string;
    thisMonth: string;
    todaySpend: string;
  };
  controller: {
    bootstrapFailed: string;
  };
  highlights: {
    activePackagesValue: string;
    availablePointsValue: string;
    currentPlan: string;
    planPostureValue: string;
    savingsOpportunity: string;
  };
  invoiceAttention: {
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    title: string;
  };
  manifest: {
    description: string;
    title: string;
  };
  page: {
    description: string;
    errorTitle: string;
    eyebrow: string;
    loading: string;
    title: string;
  };
  paymentAttention: {
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    title: string;
  };
  paymentMethod: {
    ALIPAY: string;
    BANKCARD: string;
    UNKNOWN: string;
    WECHAT: string;
  };
  posture: Record<"healthy" | "overBudget" | "paymentAttention" | "watch", string>;
  severity: {
    critical: string;
    info: string;
    warning: string;
  };
  service: {
    defaultCapability: string;
    defaultModel: string;
    defaultProvider: string;
    defaultUsageTitle: string;
    defaultUnitLabel: string;
    defaultWorkspace: string;
    guestLevelName: string;
    loadUsageFailed: string;
  };
  status: {
    completed: string;
    default: string;
    draft: string;
    failed: string;
    paid: string;
    pending: string;
    processing: string;
    submitted: string;
    unpaid: string;
  };
  tabs: {
    invoices: string;
    overview: string;
  };
  usage: {
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    title: string;
  };
  views: {
    eyebrow: string;
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

const EN_US_MESSAGES: SdkworkBillingMessages = {
  actions: {
    refresh: "Refresh billing",
  },
  alerts: {
    budgetWatch: {
      action: "Review optimization offers",
      description: "Current month spend is approaching the configured billing budget.",
      title: "Budget threshold is approaching",
    },
    invoiceAttention: {
      action: "Review invoice queue",
      description: "Invoice drafts or failed documents still need billing follow-up.",
      title: "Invoice action required",
    },
    paymentAttention: {
      action: "Resolve payment attention",
      description: "Actionable payments are still waiting for settlement and need operator attention.",
      title: "Payment attention required",
    },
    projectedBudgetOverrun: {
      action: "Review upgrade path",
      description: "Projected monthly spend is higher than the configured budget and should be optimized early.",
      title: "Projected spend exceeds budget",
    },
  },
  breakdown: {
    capability: "Capability",
    costHeader: "Cost",
    emptyDescription: "No billing usage has been aggregated for the current breakdown.",
    emptyTitle: "No breakdown data",
    eyebrow: "Breakdown",
    model: "Model",
    provider: "Provider",
    segmentHeader: "Segment",
    shareHeader: "Share",
    title: "Cost concentration",
    unitsHeader: "Units",
    workspace: "Workspace",
  },
  cards: {
    budgetRemaining: "Budget remaining",
    monthSpend: "Month spend",
    outstandingAttention: "Outstanding attention",
    posture: "Posture",
    projectedMonth: "Projected month",
    savingsOpportunity: "Savings opportunity",
    thisMonth: "This month",
    todaySpend: "Today spend",
  },
  controller: {
    bootstrapFailed: "Failed to load billing center.",
  },
  highlights: {
    activePackagesValue: "{value} active commercial packages",
    availablePointsValue: "Available points: {value}",
    currentPlan: "Current plan",
    planPostureValue: "{value} plan posture",
    savingsOpportunity: "Savings opportunity",
  },
  invoiceAttention: {
    emptyDescription: "No invoice records are waiting in the billing queue.",
    emptyTitle: "No invoices",
    eyebrow: "Invoices",
    title: "Invoice attention",
  },
  manifest: {
    description: "Billing workspace for spend posture, metered usage, budget alerts, and billing-center routing.",
    title: "Billing",
  },
  page: {
    description: "Centralize spend posture, metered usage, payment attention, and invoice follow-up in one reusable Sdkwork-grade billing workspace.",
    errorTitle: "Billing center error",
    eyebrow: "Commercial Billing",
    loading: "Loading billing center...",
    title: "Billing Center",
  },
  paymentAttention: {
    emptyDescription: "No actionable payments are currently waiting for settlement.",
    emptyTitle: "No payments",
    eyebrow: "Payments",
    title: "Payment attention",
  },
  paymentMethod: {
    ALIPAY: "Alipay",
    BANKCARD: "Bank card",
    UNKNOWN: "Payment",
    WECHAT: "WeChat Pay",
  },
  posture: {
    healthy: "Healthy",
    overBudget: "Over budget",
    paymentAttention: "Payment attention",
    watch: "Watch",
  },
  severity: {
    critical: "Critical",
    info: "Info",
    warning: "Warning",
  },
  service: {
    defaultCapability: "General",
    defaultModel: "Unknown Model",
    defaultProvider: "Unassigned",
    defaultUsageTitle: "Usage Record",
    defaultUnitLabel: "units",
    defaultWorkspace: "Default Workspace",
    guestLevelName: "Guest",
    loadUsageFailed: "Failed to load billing usage records.",
  },
  status: {
    completed: "Completed",
    default: "Unpaid",
    draft: "Draft",
    failed: "Failed",
    paid: "Paid",
    pending: "Pending",
    processing: "Processing",
    submitted: "Submitted",
    unpaid: "Unpaid",
  },
  tabs: {
    invoices: "Invoices",
    overview: "Overview",
  },
  usage: {
    emptyDescription: "No usage matched the current billing breakdown selection.",
    emptyTitle: "No usage records",
    eyebrow: "Usage",
    title: "Recent metered usage",
  },
  views: {
    eyebrow: "Billing views",
    title: "Usage and settlement posture",
  },
};

const ZH_CN_MESSAGES: SdkworkBillingMessages = {
  actions: {
    refresh: "\u5237\u65b0\u8d26\u5355",
  },
  alerts: {
    budgetWatch: {
      action: "\u67e5\u770b\u4f18\u5316\u4f18\u60e0",
      description: "\u672c\u6708\u652f\u51fa\u5df2\u63a5\u8fd1\u5f53\u524d\u8d26\u5355\u9884\u7b97\u9608\u503c\u3002",
      title: "\u9884\u7b97\u9608\u503c\u5373\u5c06\u89e6\u53d1",
    },
    invoiceAttention: {
      action: "\u590d\u6838\u53d1\u7968\u961f\u5217",
      description: "\u53d1\u7968\u8349\u7a3f\u6216\u5931\u8d25\u5355\u636e\u4ecd\u9700\u8981\u8d26\u5355\u8ddf\u8fdb\u3002",
      title: "\u53d1\u7968\u9700\u8981\u5904\u7406",
    },
    paymentAttention: {
      action: "\u5904\u7406\u5f85\u652f\u4ed8\u9879",
      description: "\u4ecd\u6709\u9700\u8981\u7ed3\u7b97\u7684\u652f\u4ed8\u9879\u5f85\u8fd0\u8425\u5904\u7406\u3002",
      title: "\u652f\u4ed8\u5f85\u5904\u7406",
    },
    projectedBudgetOverrun: {
      action: "\u67e5\u770b\u5347\u7ea7\u8def\u5f84",
      description: "\u9884\u4f30\u672c\u6708\u652f\u51fa\u5df2\u8d85\u8fc7\u914d\u7f6e\u9884\u7b97\uff0c\u9700\u8981\u63d0\u524d\u4f18\u5316\u3002",
      title: "\u9884\u4f30\u652f\u51fa\u8d85\u51fa\u9884\u7b97",
    },
  },
  breakdown: {
    capability: "\u80fd\u529b",
    costHeader: "\u8d39\u7528",
    emptyDescription: "\u5f53\u524d\u7ef4\u5ea6\u6682\u65e0\u805a\u5408\u8d26\u5355\u7528\u91cf\u6570\u636e\u3002",
    emptyTitle: "\u6682\u65e0\u5206\u5e03\u6570\u636e",
    eyebrow: "\u5206\u5e03",
    model: "\u6a21\u578b",
    provider: "\u4f9b\u5e94\u5546",
    segmentHeader: "\u5206\u6bb5",
    shareHeader: "\u5360\u6bd4",
    title: "\u8d39\u7528\u5206\u5e03",
    unitsHeader: "\u7528\u91cf",
    workspace: "\u5de5\u4f5c\u533a",
  },
  cards: {
    budgetRemaining: "\u9884\u7b97\u5269\u4f59",
    monthSpend: "\u672c\u6708\u652f\u51fa",
    outstandingAttention: "\u5f85\u5904\u7406\u91d1\u989d",
    posture: "\u72b6\u6001",
    projectedMonth: "\u672c\u6708\u9884\u4f30",
    savingsOpportunity: "\u53ef\u8282\u7701\u7a7a\u95f4",
    thisMonth: "\u672c\u6708",
    todaySpend: "\u4eca\u65e5\u652f\u51fa",
  },
  controller: {
    bootstrapFailed: "\u52a0\u8f7d\u8d26\u5355\u4e2d\u5fc3\u5931\u8d25\u3002",
  },
  highlights: {
    activePackagesValue: "\u5df2\u5f00\u542f {value} \u4e2a\u5546\u4e1a\u5316\u5957\u9910",
    availablePointsValue: "\u53ef\u7528\u79ef\u5206\uff1a{value}",
    currentPlan: "\u5f53\u524d\u5957\u9910",
    planPostureValue: "{value} \u5957\u9910\u72b6\u6001",
    savingsOpportunity: "\u8282\u7701\u673a\u4f1a",
  },
  invoiceAttention: {
    emptyDescription: "\u5f53\u524d\u8d26\u5355\u961f\u5217\u4e2d\u6ca1\u6709\u5f85\u8ddf\u8fdb\u7684\u53d1\u7968\u8bb0\u5f55\u3002",
    emptyTitle: "\u6682\u65e0\u53d1\u7968",
    eyebrow: "\u53d1\u7968",
    title: "\u53d1\u7968\u5f85\u529e",
  },
  manifest: {
    description: "\u7528\u4e8e\u7ba1\u7406\u652f\u51fa\u72b6\u6001\u3001\u8ba1\u91cf\u7528\u91cf\u3001\u9884\u7b97\u9884\u8b66\u4e0e\u8d26\u5355\u4e2d\u5fc3\u8def\u7531\u7684\u5de5\u4f5c\u533a\u3002",
    title: "\u8d26\u5355",
  },
  page: {
    description: "\u5728\u4e00\u4e2a\u53ef\u590d\u7528\u7684 Sdkwork \u98ce\u683c\u8d26\u5355\u5de5\u4f5c\u533a\u4e2d\uff0c\u96c6\u4e2d\u67e5\u770b\u652f\u51fa\u72b6\u6001\u3001\u7528\u91cf\u6d88\u8017\u3001\u652f\u4ed8\u98ce\u9669\u4e0e\u53d1\u7968\u8ddf\u8fdb\u3002",
    errorTitle: "\u8d26\u5355\u4e2d\u5fc3\u5f02\u5e38",
    eyebrow: "\u5546\u4e1a\u5316\u8d26\u5355",
    loading: "\u6b63\u5728\u52a0\u8f7d\u8d26\u5355\u4e2d\u5fc3...",
    title: "\u8d26\u5355\u4e2d\u5fc3",
  },
  paymentAttention: {
    emptyDescription: "\u5f53\u524d\u6682\u65e0\u7b49\u5f85\u7ed3\u7b97\u7684\u652f\u4ed8\u9879\u3002",
    emptyTitle: "\u6682\u65e0\u652f\u4ed8",
    eyebrow: "\u652f\u4ed8",
    title: "\u652f\u4ed8\u5f85\u529e",
  },
  paymentMethod: {
    ALIPAY: "\u652f\u4ed8\u5b9d",
    BANKCARD: "\u94f6\u884c\u5361",
    UNKNOWN: "\u652f\u4ed8",
    WECHAT: "\u5fae\u4fe1\u652f\u4ed8",
  },
  posture: {
    healthy: "\u5065\u5eb7",
    overBudget: "\u8d85\u51fa\u9884\u7b97",
    paymentAttention: "\u652f\u4ed8\u5f85\u5904\u7406",
    watch: "\u9700\u8981\u5173\u6ce8",
  },
  severity: {
    critical: "\u7d27\u6025",
    info: "\u63d0\u793a",
    warning: "\u9884\u8b66",
  },
  service: {
    defaultCapability: "\u901a\u7528",
    defaultModel: "\u672a\u77e5\u6a21\u578b",
    defaultProvider: "\u672a\u5206\u7c7b",
    defaultUsageTitle: "\u7528\u91cf\u8bb0\u5f55",
    defaultUnitLabel: "\u5355\u4f4d",
    defaultWorkspace: "\u9ed8\u8ba4\u5de5\u4f5c\u533a",
    guestLevelName: "\u8bbf\u5ba2",
    loadUsageFailed: "\u52a0\u8f7d\u8d26\u5355\u7528\u91cf\u8bb0\u5f55\u5931\u8d25\u3002",
  },
  status: {
    completed: "\u5df2\u5b8c\u6210",
    default: "\u672a\u652f\u4ed8",
    draft: "\u8349\u7a3f",
    failed: "\u5931\u8d25",
    paid: "\u5df2\u652f\u4ed8",
    pending: "\u5f85\u5904\u7406",
    processing: "\u5904\u7406\u4e2d",
    submitted: "\u5df2\u63d0\u4ea4",
    unpaid: "\u672a\u652f\u4ed8",
  },
  tabs: {
    invoices: "\u53d1\u7968",
    overview: "\u6982\u89c8",
  },
  usage: {
    emptyDescription: "\u5f53\u524d\u5206\u5e03\u7b5b\u9009\u4e0b\u6682\u65e0\u7528\u91cf\u8bb0\u5f55\u3002",
    emptyTitle: "\u6682\u65e0\u7528\u91cf\u8bb0\u5f55",
    eyebrow: "\u7528\u91cf",
    title: "\u6700\u8fd1\u8ba1\u8d39\u7528\u91cf",
  },
  views: {
    eyebrow: "\u8d26\u5355\u89c6\u56fe",
    title: "\u7528\u91cf\u4e0e\u7ed3\u7b97\u6001\u52bf",
  },
};

const SDKWORK_BILLING_MESSAGES: Record<SdkworkBillingLocale, SdkworkBillingMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

function interpolateTemplate(template: string, value: string): string {
  return template.replaceAll("{value}", value);
}

export function normalizeSdkworkBillingLocale(locale?: string | null): SdkworkBillingLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkBillingMessages(
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): SdkworkBillingMessages {
  return mergeDeep(
    SDKWORK_BILLING_MESSAGES[normalizeSdkworkBillingLocale(locale)],
    overrides,
  );
}

export function formatSdkworkBillingPlanPosture(
  levelName: string,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);
  return interpolateTemplate(copy.highlights.planPostureValue, levelName);
}

export function formatSdkworkBillingActivePackages(
  value: number,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);
  return interpolateTemplate(copy.highlights.activePackagesValue, String(value));
}

export function formatSdkworkBillingAvailablePoints(
  value: number,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);
  return interpolateTemplate(copy.highlights.availablePointsValue, String(value));
}

export function formatSdkworkBillingPostureLabel(
  posture: SdkworkBillingPosture,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);

  if (posture === "healthy") {
    return copy.posture.healthy;
  }

  if (posture === "watch") {
    return copy.posture.watch;
  }

  if (posture === "over-budget") {
    return copy.posture.overBudget;
  }

  return copy.posture.paymentAttention;
}

export function formatSdkworkBillingBreakdownLabel(
  kind: SdkworkBillingBreakdownKey,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);
  return copy.breakdown[kind];
}

export function formatSdkworkBillingTopActionLabel(
  action: Pick<SdkworkBillingRecommendedAction, "label" | "reason">,
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, overrides);

  if (action.reason === "payment-attention") {
    return copy.alerts.paymentAttention.action;
  }

  if (action.reason === "over-budget") {
    return copy.alerts.projectedBudgetOverrun.action;
  }

  if (action.reason === "invoice-attention") {
    return copy.alerts.invoiceAttention.action;
  }

  if (action.reason === "budget-watch") {
    return copy.alerts.budgetWatch.action;
  }

  return action.label;
}
