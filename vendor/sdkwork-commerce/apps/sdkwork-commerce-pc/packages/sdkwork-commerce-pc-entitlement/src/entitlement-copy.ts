export type SdkworkEntitlementLocale = "en-US" | "zh-CN";

export type SdkworkEntitlementMessagesOverrides = DeepPartial<SdkworkEntitlementMessages>;

export interface SdkworkEntitlementMessages {
  actions: {
    openRecommendedAction: string;
    refresh: string;
  };
  cards: {
    attentionCapabilities: string;
    availablePoints: string;
    featuredUpgradeRoutes: string;
    membershipPrefix: string;
    subscriptionPlanSuffix: string;
    trackedCapabilitySuffix: string;
  };
  controller: {
    bootstrapFailed: string;
  };
  empty: {
    noCapabilitiesInFilter: string;
  };
  filters: {
    all: string;
    attention: string;
    limited: string;
    locked: string;
    ready: string;
    rechargeRequired: string;
    upgradeRequired: string;
  };
  gate: {
    badge: string;
    limitedMessage: string;
    lockedMessage: string;
    postureTitle: string;
    rechargeRequiredMessage: string;
    remainingQuotaLabel: string;
    statusLabel: string;
    upgradeRequiredMessage: string;
  };
  manifest: {
    description: string;
    title: string;
  };
  page: {
    description: string;
    eyebrow: string;
    errorTitle: string;
    loading: string;
    title: string;
  };
  section: {
    capabilityFiltersEyebrow: string;
    capabilityFiltersTitle: string;
    selectedCapability: string;
  };
  selected: {
    currentStatusLabel: string;
    descriptionFallback: string;
    emptyPrompt: string;
    postureSuffix: string;
    remainingQuotaLabel: string;
  };
  service: {
    actionExploreAccessOptions: string;
    actionOpenRecharge: string;
    actionOpenUpgrade: string;
    actionReviewUpgradeOptions: string;
    guestLabel: string;
  };
  status: {
    limited: string;
    locked: string;
    ready: string;
    rechargeRequired: string;
    upgradeRequired: string;
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

const EN_US_MESSAGES: SdkworkEntitlementMessages = {
  actions: {
    openRecommendedAction: "Open recommended action",
    refresh: "Refresh access",
  },
  cards: {
    attentionCapabilities: "Attention capabilities",
    availablePoints: "Available points",
    featuredUpgradeRoutes: "Featured upgrade routes",
    membershipPrefix: "Membership:",
    subscriptionPlanSuffix: "subscription plans available",
    trackedCapabilitySuffix: "tracked capability modules",
  },
  controller: {
    bootstrapFailed: "Failed to load entitlement center.",
  },
  empty: {
    noCapabilitiesInFilter: "No capabilities match the current filter.",
  },
  filters: {
    all: "All",
    attention: "Attention",
    limited: "Near limit",
    locked: "Locked",
    ready: "Ready",
    rechargeRequired: "Recharge required",
    upgradeRequired: "Upgrade required",
  },
  gate: {
    badge: "Commercial Access",
    limitedMessage: "Only {value} slots remain before this capability needs a commercial action.",
    lockedMessage: "Sign in and review premium access options before opening this surface.",
    postureTitle: "Commercial posture",
    rechargeRequiredMessage: "Recharge points to restore access for this premium workflow.",
    remainingQuotaLabel: "Remaining quota",
    statusLabel: "Status",
    upgradeRequiredMessage: "Upgrade the current commercial plan to unlock this capability.",
  },
  manifest: {
    description: "Entitlement workspace for commercial access, quota posture, paywall routing, and premium capability readiness.",
    title: "Entitlements",
  },
  page: {
    description: "Review premium posture, spot quota pressure, and route blocked capabilities into the right upgrade or recharge flow before users hit a hard wall.",
    eyebrow: "Commercial Access",
    errorTitle: "Entitlement center error",
    loading: "Loading entitlement center...",
    title: "Entitlement Center",
  },
  section: {
    capabilityFiltersEyebrow: "Capability filters",
    capabilityFiltersTitle: "Access posture",
    selectedCapability: "Selected capability",
  },
  selected: {
    currentStatusLabel: "Current status",
    descriptionFallback: "Commercial readiness and access posture for this capability.",
    emptyPrompt: "Select a capability to inspect its commercial posture.",
    postureSuffix: "posture",
    remainingQuotaLabel: "Remaining quota",
  },
  service: {
    actionExploreAccessOptions: "Explore access options",
    actionOpenRecharge: "Open recharge",
    actionOpenUpgrade: "Open upgrade",
    actionReviewUpgradeOptions: "Review upgrade options",
    guestLabel: "Guest",
  },
  status: {
    limited: "Near limit",
    locked: "Sign in required",
    ready: "Ready",
    rechargeRequired: "Recharge required",
    upgradeRequired: "Upgrade required",
  },
};

const ZH_CN_MESSAGES: SdkworkEntitlementMessages = {
  actions: {
    openRecommendedAction: "打开推荐操作",
    refresh: "刷新权益",
  },
  cards: {
    attentionCapabilities: "待处理能力",
    availablePoints: "可用积分",
    featuredUpgradeRoutes: "精选升级路径",
    membershipPrefix: "会员：",
    subscriptionPlanSuffix: "个订阅套餐",
    trackedCapabilitySuffix: "个可追踪能力模块",
  },
  controller: {
    bootstrapFailed: "加载权益中心失败。",
  },
  empty: {
    noCapabilitiesInFilter: "当前筛选条件下暂无能力项目。",
  },
  filters: {
    all: "全部",
    attention: "待处理",
    limited: "接近限额",
    locked: "已锁定",
    ready: "就绪",
    rechargeRequired: "需要充值",
    upgradeRequired: "需要升级",
  },
  gate: {
    badge: "商业访问",
    limitedMessage: "仅剩 {value} 次额度，耗尽后需要执行商业化操作。",
    lockedMessage: "请先登录并查看高级权益方案，再访问该能力界面。",
    postureTitle: "商业状态",
    rechargeRequiredMessage: "请充值积分以恢复该高级工作流访问。",
    remainingQuotaLabel: "剩余配额",
    statusLabel: "状态",
    upgradeRequiredMessage: "请升级当前商业套餐以解锁该能力。",
  },
  manifest: {
    description: "用于统一查看商业访问、配额状态、付费墙路由与高级能力就绪度的权益工作区。",
    title: "权益中心",
  },
  page: {
    description: "统一查看高级能力访问状态，提前识别配额压力，并将受限能力导航到正确的升级或充值流程。",
    eyebrow: "商业访问",
    errorTitle: "权益中心异常",
    loading: "正在加载权益中心...",
    title: "权益中心",
  },
  section: {
    capabilityFiltersEyebrow: "能力筛选",
    capabilityFiltersTitle: "访问状态",
    selectedCapability: "已选能力",
  },
  selected: {
    currentStatusLabel: "当前状态",
    descriptionFallback: "查看该能力的商业就绪度与访问状态。",
    emptyPrompt: "请选择一个能力来查看其商业状态。",
    postureSuffix: "状态",
    remainingQuotaLabel: "剩余配额",
  },
  service: {
    actionExploreAccessOptions: "查看访问方案",
    actionOpenRecharge: "打开充值",
    actionOpenUpgrade: "打开升级",
    actionReviewUpgradeOptions: "查看升级方案",
    guestLabel: "访客",
  },
  status: {
    limited: "接近限额",
    locked: "需登录",
    ready: "就绪",
    rechargeRequired: "需要充值",
    upgradeRequired: "需要升级",
  },
};

const SDKWORK_ENTITLEMENT_MESSAGES: Record<SdkworkEntitlementLocale, SdkworkEntitlementMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkEntitlementLocale(locale?: string | null): SdkworkEntitlementLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkEntitlementMessages(
  locale?: string | null,
  overrides?: SdkworkEntitlementMessagesOverrides,
): SdkworkEntitlementMessages {
  return mergeDeep(
    SDKWORK_ENTITLEMENT_MESSAGES[normalizeSdkworkEntitlementLocale(locale)],
    overrides,
  );
}
