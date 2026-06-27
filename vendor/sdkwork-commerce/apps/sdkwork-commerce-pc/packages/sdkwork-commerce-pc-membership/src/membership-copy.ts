import { formatSdkworkCommercePoints as formatSdkworkPoints } from "@sdkwork/commerce-service";

export type SdkworkMembershipLocale = "en-US" | "zh-CN";

export type SdkworkMembershipMessagesOverrides = DeepPartial<SdkworkMembershipMessages>;

export interface SdkworkMembershipMessages {
  actions: {
    benefits: string;
    levels: string;
    plans: string;
    refresh: string;
    renew: string;
    selectPlan: string;
    selected: string;
    upgrade: string;
  };
  benefits: {
    claimed: string;
    descriptionFallback: string;
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    pending: string;
    title: string;
    typeFallback: string;
    usageValue: string;
  };
  common: {
    flexibleDuration: string;
    noValue: string;
  };
  format: {
    daysValue: string;
    priceWasValue: string;
  };
  hero: {
    currentLevel: string;
    description: string;
    eyebrow: string;
    includedPoints: string;
    noPackageDescription: string;
    noPackageSelected: string;
    price: string;
    remaining: string;
    selectedOffer: string;
    status: string;
    title: string;
    points: string;
  };
  levels: {
    compareLevel: string;
    currentLevelAction: string;
    currentLabel: string;
    descriptionFallback: string;
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    requiredPoints: string;
    title: string;
  };
  page: {
    errorTitle: string;
    loading: string;
  };
  plans: {
    descriptionFallback: string;
    emptyDescription: string;
    emptyTitle: string;
    eyebrow: string;
    popular: string;
    title: string;
  };
  service: {
    purchaseFailed: string;
    renewFailed: string;
    signInRequired: string;
    upgradeFailed: string;
  };
  status: {
    active: string;
    free: string;
    guest: string;
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

const EN_US_MESSAGES: SdkworkMembershipMessages = {
  actions: {
    benefits: "Benefits",
    levels: "Levels",
    plans: "Plans",
    refresh: "Refresh membership center",
    renew: "Renew membership",
    selectPlan: "Select plan",
    selected: "Selected",
    upgrade: "Upgrade now",
  },
  benefits: {
    claimed: "Claimed",
    descriptionFallback: "Premium membership benefit",
    emptyDescription: "Benefit unlocks and usage allowances will appear here when they are available.",
    emptyTitle: "No membership benefits",
    eyebrow: "Benefits",
    pending: "Pending",
    title: "Membership benefits",
    typeFallback: "benefit",
    usageValue: "{used}/{limit} used",
  },
  common: {
    flexibleDuration: "Flexible duration",
    noValue: "--",
  },
  format: {
    daysValue: "{value} days",
    priceWasValue: "Was {value}",
  },
  hero: {
    currentLevel: "Current level",
    description: "Standardize premium plans, benefits, and renew or upgrade workflows into one Sdkwork-inspired desktop capability.",
    eyebrow: "Membership",
    includedPoints: "Included points",
    noPackageDescription: "Pick a package to compare price, included points, and membership duration.",
    noPackageSelected: "No package selected",
    price: "Price",
    remaining: "Remaining",
    selectedOffer: "Selected offer",
    status: "Status",
    title: "Membership Center",
    points: "Membership points",
  },
  levels: {
    compareLevel: "Compare level",
    currentLevelAction: "Current level",
    currentLabel: "Current",
    descriptionFallback: "Premium membership level",
    emptyDescription: "Level comparison will appear when membership level data is available.",
    emptyTitle: "No membership levels",
    eyebrow: "Levels",
    requiredPoints: "Required points",
    title: "Level comparison",
  },
  page: {
    errorTitle: "Membership center error",
    loading: "Loading membership center...",
  },
  plans: {
    descriptionFallback: "Premium membership offer",
    emptyDescription: "No membership plans are currently available in this workspace.",
    emptyTitle: "No membership plans",
    eyebrow: "Plans",
    popular: "Popular",
    title: "Membership plans",
  },
  service: {
    purchaseFailed: "Failed to purchase membership.",
    renewFailed: "Failed to renew membership.",
    signInRequired: "Please sign in to manage memberships.",
    upgradeFailed: "Failed to upgrade membership.",
  },
  status: {
    active: "Active",
    free: "Free",
    guest: "Guest",
  },
};

const ZH_CN_MESSAGES: SdkworkMembershipMessages = {
  actions: {
    benefits: "\u6743\u76ca",
    levels: "\u7b49\u7ea7",
    plans: "\u65b9\u6848",
    refresh: "\u5237\u65b0\u4f1a\u5458\u4e2d\u5fc3",
    renew: "\u7eed\u8d39\u4f1a\u5458",
    selectPlan: "\u9009\u62e9\u65b9\u6848",
    selected: "\u5df2\u9009\u62e9",
    upgrade: "\u7acb\u5373\u5347\u7ea7",
  },
  benefits: {
    claimed: "\u5df2\u9886\u53d6",
    descriptionFallback: "\u9ad8\u7ea7\u4f1a\u5458\u6743\u76ca",
    emptyDescription: "\u5f53\u6709\u53ef\u7528\u7684\u89e3\u9501\u6743\u76ca\u548c\u914d\u989d\u65f6\uff0c\u4f1a\u5728\u8fd9\u91cc\u5c55\u793a\u3002",
    emptyTitle: "\u6682\u65e0\u4f1a\u5458\u6743\u76ca",
    eyebrow: "\u6743\u76ca",
    pending: "\u5f85\u4f7f\u7528",
    title: "\u4f1a\u5458\u6743\u76ca",
    typeFallback: "\u6743\u76ca",
    usageValue: "\u5df2\u7528 {used}/{limit}",
  },
  common: {
    flexibleDuration: "\u65f6\u957f\u7075\u6d3b",
    noValue: "--",
  },
  format: {
    daysValue: "{value} \u5929",
    priceWasValue: "\u539f\u4ef7 {value}",
  },
  hero: {
    currentLevel: "\u5f53\u524d\u7b49\u7ea7",
    description: "\u628a\u4f1a\u5458\u65b9\u6848\u3001\u6743\u76ca\u5c55\u793a\u3001\u7eed\u8d39\u548c\u5347\u7ea7\u6d41\u7a0b\u7edf\u4e00\u6210\u4e00\u5957 Sdkwork \u98ce\u683c\u7684\u53ef\u590d\u7528\u684c\u9762\u7aef\u80fd\u529b\u3002",
    eyebrow: "\u4f1a\u5458",
    includedPoints: "\u5305\u542b\u79ef\u5206",
    noPackageDescription: "\u9009\u62e9\u4e00\u4e2a\u5957\u9910\u67e5\u770b\u4ef7\u683c\u3001\u5305\u542b\u79ef\u5206\u548c\u4f1a\u5458\u65f6\u957f\u3002",
    noPackageSelected: "\u6682\u672a\u9009\u62e9\u5957\u9910",
    price: "\u4ef7\u683c",
    remaining: "\u5269\u4f59\u65f6\u957f",
    selectedOffer: "\u5df2\u9009\u5957\u9910",
    status: "\u72b6\u6001",
    title: "\u4f1a\u5458\u4e2d\u5fc3",
    points: "\u4f1a\u5458\u79ef\u5206",
  },
  levels: {
    compareLevel: "\u5bf9\u6bd4\u7b49\u7ea7",
    currentLevelAction: "\u5f53\u524d\u7b49\u7ea7",
    currentLabel: "\u5f53\u524d",
    descriptionFallback: "\u9ad8\u7ea7\u4f1a\u5458\u7b49\u7ea7",
    emptyDescription: "\u5f53\u4f1a\u5458\u7b49\u7ea7\u6570\u636e\u53ef\u7528\u65f6\uff0c\u8fd9\u91cc\u4f1a\u5c55\u793a\u5bf9\u6bd4\u4fe1\u606f\u3002",
    emptyTitle: "\u6682\u65e0\u4f1a\u5458\u7b49\u7ea7",
    eyebrow: "\u7b49\u7ea7",
    requiredPoints: "\u9700\u8981\u79ef\u5206",
    title: "\u7b49\u7ea7\u5bf9\u6bd4",
  },
  page: {
    errorTitle: "\u4f1a\u5458\u4e2d\u5fc3\u5f02\u5e38",
    loading: "\u6b63\u5728\u52a0\u8f7d\u4f1a\u5458\u4e2d\u5fc3...",
  },
  plans: {
    descriptionFallback: "\u9ad8\u7ea7\u4f1a\u5458\u5957\u9910",
    emptyDescription: "\u5f53\u524d\u5de5\u4f5c\u533a\u6682\u65e0\u53ef\u7528\u7684\u4f1a\u5458\u5957\u9910\u3002",
    emptyTitle: "\u6682\u65e0\u4f1a\u5458\u65b9\u6848",
    eyebrow: "\u65b9\u6848",
    popular: "\u63a8\u8350",
    title: "\u4f1a\u5458\u65b9\u6848",
  },
  service: {
    purchaseFailed: "\u8d2d\u4e70\u4f1a\u5458\u5931\u8d25\u3002",
    renewFailed: "\u7eed\u8d39\u4f1a\u5458\u5931\u8d25\u3002",
    signInRequired: "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u4f1a\u5458\u3002",
    upgradeFailed: "\u5347\u7ea7\u4f1a\u5458\u5931\u8d25\u3002",
  },
  status: {
    active: "\u751f\u6548\u4e2d",
    free: "\u514d\u8d39",
    guest: "\u6e38\u5ba2",
  },
};

const SDKWORK_MEMBERSHIP_MESSAGES: Record<SdkworkMembershipLocale, SdkworkMembershipMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkMembershipLocale(locale?: string | null): SdkworkMembershipLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkMembershipMessages(
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): SdkworkMembershipMessages {
  return mergeDeep(
    SDKWORK_MEMBERSHIP_MESSAGES[normalizeSdkworkMembershipLocale(locale)],
    overrides,
  );
}

export function formatSdkworkMembershipTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return interpolateTemplate(template, replacements);
}

export function formatSdkworkMembershipStatusLabel(
  value: "active" | "free" | "guest",
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): string {
  const copy = createSdkworkMembershipMessages(locale, overrides);
  return copy.status[value];
}

export function formatSdkworkMembershipDurationLabel(
  value: number | null,
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): string {
  const copy = createSdkworkMembershipMessages(locale, overrides);

  if (value === null) {
    return copy.common.flexibleDuration;
  }

  return interpolateTemplate(copy.format.daysValue, {
    value: String(value),
  });
}

export function formatSdkworkMembershipIncludedPointsLabel(
  value: number,
  locale?: string | null,
): string {
  return formatSdkworkPoints(value, normalizeSdkworkMembershipLocale(locale));
}

export function formatSdkworkMembershipUsageLabel(
  used: number | null,
  limit: number | null,
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): string {
  const copy = createSdkworkMembershipMessages(locale, overrides);

  if (limit === null) {
    return copy.common.noValue;
  }

  return interpolateTemplate(copy.benefits.usageValue, {
    limit: String(limit),
    used: String(used ?? 0),
  });
}

export function formatSdkworkMembershipPriceWasLabel(
  value: string,
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): string {
  const copy = createSdkworkMembershipMessages(locale, overrides);

  return interpolateTemplate(copy.format.priceWasValue, {
    value,
  });
}
