export type SdkworkSubscriptionLocale = "en-US" | "zh-CN";

export type SdkworkSubscriptionMessagesOverrides = DeepPartial<SdkworkSubscriptionMessages>;

export interface SdkworkSubscriptionMessages {
  actions: {
    activateMembership: string;
    backToPlans: string;
    clearCoupon: string;
    confirmPayment: string;
    confirmRenewal: string;
    continueToCheckout: string;
    purchase: string;
    renew: string;
    selectPlan: string;
    selectedPlan: string;
    upgrade: string;
  };
  checkoutPanel: {
    checkoutErrorTitle: string;
    description: string;
    lockedBadge: string;
    signInRequiredDescription: string;
    signInRequiredTitle: string;
    title: string;
  };
  common: {
    current: string;
    days: string;
    flexibleDuration: string;
    points: string;
  };
  couponList: {
    description: string;
    eyebrow: string;
    minSpendLabel: string;
    noCoupons: string;
    noMinimumSpend: string;
    offerFallback: string;
    removeCoupon: string;
    selectedOffer: string;
    tapToUse: string;
  };
  format: {
    couponCountReadyPlural: string;
    couponCountReadySingular: string;
    couponDaysLeft: string;
    currentLevelRemaining: string;
    discountRate: string;
  };
  hero: {
    availablePlansLabel: string;
    currentLevelLabel: string;
    description: string;
    eyebrow: string;
    freeMembershipActive: string;
    membershipBalanceLabel: string;
    premiumMembershipActive: string;
    readyForPremiumActivation: string;
    title: string;
  };
  levelGrid: {
    empty: string;
    eyebrow: string;
    levelFallback: string;
    title: string;
  };
  page: {
    errorTitle: string;
    loading: string;
  };
  paymentMethods: {
    alipayLabel: string;
    appRedirectLabel: string;
    description: string;
    desktopPayment: string;
    eyebrow: string;
    nativeLabel: string;
    noMethods: string;
    openInPaymentApp: string;
    pcWebLabel: string;
    recommended: string;
    scanToPay: string;
    selectedState: string;
    tapToUse: string;
    wechatPayLabel: string;
  };
  planGrid: {
    benefitsEmpty: string;
    benefitsEyebrow: string;
    benefitFallback: string;
    currentBalanceLabel: string;
    currentPlanButton: string;
    currentTag: string;
    entryTier: string;
    freeBaselineButton: string;
    freeMembershipDescription: string;
    freeMembershipTitle: string;
    noPlans: string;
    noRecurringCharge: string;
    signInToActivatePremiumCheckout: string;
    title: string;
    titleEyebrow: string;
  };
  priceSummary: {
    amountDueLabel: string;
    couponDeductionLabel: string;
    originalPriceLabel: string;
    paymentRailLabel: string;
  };
  selectedPlan: {
    eyebrow: string;
    fallbackDescription: string;
    noPlanSelectedDescription: string;
    noPlanSelectedTitle: string;
  };
  stageShell: {
    actionLabel: string;
    availablePlansLabel: string;
    checkoutAmountLabel: string;
    checkoutDescription: string;
    checkoutStatusDescription: string;
    checkoutTitle: string;
    couponsReadyLabel: string;
    currentLevelLabel: string;
    descriptionLockedPackage: string;
    descriptionNoPlanSelected: string;
    durationLabel: string;
    includedPointsLabel: string;
    lockedBadge: string;
    lockedPackageLabel: string;
    planStageDescription: string;
    planStageTitle: string;
    plannedActionLabel: string;
    priceLabel: string;
    purchaseStagesEyebrow: string;
    readyDescription: string;
    readyTitle: string;
    selectedPackageLabel: string;
    signInRequiredDescription: string;
    signInRequiredTitle: string;
    stepCheckoutDescription: string;
    stepCheckoutTitle: string;
    stepPlanDescription: string;
    stepPlanTitle: string;
    twoStepFlow: string;
  };
  service: {
    checkoutFailed: string;
    loadDashboardFailed: string;
    purchaseFailed: string;
    renewFailed: string;
    requestFailed: string;
    selectPlanBeforeContinue: string;
    signInRequired: string;
    upgradeFailed: string;
  };
  status: {
    available: string;
    expired: string;
    inactive: string;
    used: string;
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

const EN_US_MESSAGES: SdkworkSubscriptionMessages = {
  actions: {
    activateMembership: "Activate membership",
    backToPlans: "Back to plans",
    clearCoupon: "Remove coupon",
    confirmPayment: "Confirm payment",
    confirmRenewal: "Confirm renewal",
    continueToCheckout: "Continue to checkout",
    purchase: "Purchase",
    renew: "Renew",
    selectPlan: "Select plan",
    selectedPlan: "Selected",
    upgrade: "Upgrade",
  },
  checkoutPanel: {
    checkoutErrorTitle: "Checkout error",
    description: "Package details, coupon state, and payment rail stay synchronized with the selected subscription package.",
    lockedBadge: "Locked checkout",
    signInRequiredDescription: "Membership checkout requires an authenticated session.",
    signInRequiredTitle: "Sign in required",
    title: "Checkout summary",
  },
  common: {
    current: "Current",
    days: "days",
    flexibleDuration: "Flexible duration",
    points: "points",
  },
  couponList: {
    description: "Apply the strongest eligible offer before payment.",
    eyebrow: "Coupon selection",
    minSpendLabel: "Min spend",
    noCoupons: "No checkout coupons are currently available.",
    noMinimumSpend: "No minimum spend",
    offerFallback: "Offer",
    removeCoupon: "Remove coupon",
    selectedOffer: "Selected offer",
    tapToUse: "Tap to use",
  },
  format: {
    couponCountReadyPlural: "{count} coupons ready for checkout",
    couponCountReadySingular: "{count} coupon ready for checkout",
    couponDaysLeft: "{count} {days} left",
    currentLevelRemaining: "{count} {days} remaining",
    discountRate: "{value} discount",
  },
  hero: {
    availablePlansLabel: "Available plans",
    currentLevelLabel: "Current level",
    description: "Select a membership plan, apply the best coupon, and lock one premium checkout flow that any SDKWORK desktop app can embed.",
    eyebrow: "Premium checkout",
    freeMembershipActive: "Free membership active",
    membershipBalanceLabel: "Membership balance",
    premiumMembershipActive: "Premium membership active",
    readyForPremiumActivation: "Ready for premium activation",
    title: "Subscription center",
  },
  levelGrid: {
    empty: "Membership level comparison will appear when the current runtime exposes membership levels.",
    eyebrow: "Membership ladder",
    levelFallback: "Membership level",
    title: "Membership levels",
  },
  page: {
    errorTitle: "Subscription center error",
    loading: "Loading subscription center...",
  },
  paymentMethods: {
    alipayLabel: "Alipay",
    appRedirectLabel: "App redirect",
    description: "Choose the live payment rail exposed by the commerce runtime.",
    desktopPayment: "Desktop payment",
    eyebrow: "Payment method",
    nativeLabel: "Native",
    noMethods: "Payment methods will appear when the runtime exposes a live payment contract.",
    openInPaymentApp: "Open in payment app",
    pcWebLabel: "PC Web",
    recommended: "Recommended",
    scanToPay: "Scan to pay",
    selectedState: "Currently selected",
    tapToUse: "Tap to use",
    wechatPayLabel: "WeChat Pay",
  },
  planGrid: {
    benefitsEmpty: "Benefit highlights will appear when the membership catalog exposes them.",
    benefitsEyebrow: "Premium benefits",
    benefitFallback: "Premium entitlement",
    currentBalanceLabel: "Current balance",
    currentPlanButton: "Current plan",
    currentTag: "Current",
    entryTier: "Entry tier",
    freeBaselineButton: "Free baseline",
    freeMembershipDescription: "Compare free and premium before checkout. Keep a zero-commit baseline for lightweight usage.",
    freeMembershipTitle: "Free membership",
    noPlans: "No subscription plans are currently available.",
    noRecurringCharge: "No recurring charge",
    signInToActivatePremiumCheckout: "Sign in to activate premium checkout",
    title: "Choose a premium package",
    titleEyebrow: "Plan selection",
  },
  priceSummary: {
    amountDueLabel: "Amount due",
    couponDeductionLabel: "Coupon deduction",
    originalPriceLabel: "Original price",
    paymentRailLabel: "Payment rail",
  },
  selectedPlan: {
    eyebrow: "Selected package",
    fallbackDescription: "Premium subscription package",
    noPlanSelectedDescription: "Choose a subscription plan to unlock checkout.",
    noPlanSelectedTitle: "No plan selected",
  },
  stageShell: {
    actionLabel: "Action",
    availablePlansLabel: "Available plans",
    checkoutAmountLabel: "Checkout amount",
    checkoutDescription: "The selected package is now locked for payment. Coupons, amount due, and payment method stay synchronized with this package until checkout completes.",
    checkoutStatusDescription: "Return to plans if you need to switch package before payment.",
    checkoutTitle: "Locked checkout",
    couponsReadyLabel: "Coupons ready",
    currentLevelLabel: "Current level",
    descriptionLockedPackage: "Return to the previous stage to choose a package before checkout.",
    descriptionNoPlanSelected: "Choose a subscription plan to continue into checkout.",
    durationLabel: "Duration",
    includedPointsLabel: "Included points",
    lockedBadge: "Locked package",
    lockedPackageLabel: "Locked package",
    planStageDescription: "Compare packages, keep the current membership baseline in view, and move into checkout only when the selected package is ready.",
    planStageTitle: "Select a premium package",
    plannedActionLabel: "Planned action",
    priceLabel: "Price",
    purchaseStagesEyebrow: "Purchase stages",
    readyDescription: "Package details stay locked after you enter checkout, but you can always return to this stage to switch packages before paying.",
    readyTitle: "Ready to continue",
    selectedPackageLabel: "Selected package",
    signInRequiredDescription: "Checkout stays available after sign-in. You can still compare packages before authenticating.",
    signInRequiredTitle: "Sign in required",
    stepCheckoutDescription: "Lock the package, apply coupons, and confirm payment.",
    stepCheckoutTitle: "2. Checkout",
    stepPlanDescription: "Compare free and premium packages before payment.",
    stepPlanTitle: "1. Select plan",
    twoStepFlow: "2-step flow",
  },
  service: {
    checkoutFailed: "Subscription checkout failed.",
    loadDashboardFailed: "Failed to load subscription center.",
    purchaseFailed: "Failed to purchase subscription.",
    renewFailed: "Failed to renew subscription.",
    requestFailed: "Request failed.",
    selectPlanBeforeContinue: "Select a subscription plan before continuing.",
    signInRequired: "Please sign in to manage subscriptions.",
    upgradeFailed: "Failed to upgrade subscription.",
  },
  status: {
    available: "Available",
    expired: "Expired",
    inactive: "Inactive",
    used: "Used",
  },
};

const ZH_CN_MESSAGES: SdkworkSubscriptionMessages = {
  actions: {
    activateMembership: "开通会员",
    backToPlans: "返回套餐",
    clearCoupon: "移除优惠券",
    confirmPayment: "确认支付",
    confirmRenewal: "确认续费",
    continueToCheckout: "继续前往结算",
    purchase: "购买",
    renew: "续费",
    selectPlan: "选择套餐",
    selectedPlan: "已选择",
    upgrade: "升级",
  },
  checkoutPanel: {
    checkoutErrorTitle: "结算异常",
    description: "套餐详情、优惠状态与支付通道会始终与当前选中的订阅套餐保持同步。",
    lockedBadge: "锁定结算",
    signInRequiredDescription: "会员结算需要先完成登录。",
    signInRequiredTitle: "需要登录",
    title: "结算摘要",
  },
  common: {
    current: "当前",
    days: "天",
    flexibleDuration: "时长灵活",
    points: "积分",
  },
  couponList: {
    description: "支付前优先应用当前可用的最优优惠。",
    eyebrow: "优惠券选择",
    minSpendLabel: "满",
    noCoupons: "当前没有可用于结算的优惠券。",
    noMinimumSpend: "无门槛",
    offerFallback: "优惠",
    removeCoupon: "移除优惠券",
    selectedOffer: "已选优惠",
    tapToUse: "点击使用",
  },
  format: {
    couponCountReadyPlural: "有 {count} 张优惠券可用于结算",
    couponCountReadySingular: "有 {count} 张优惠券可用于结算",
    couponDaysLeft: "剩余 {count} {days}",
    currentLevelRemaining: "剩余 {count} {days}",
    discountRate: "{value} 折",
  },
  hero: {
    availablePlansLabel: "可选套餐",
    currentLevelLabel: "当前等级",
    description: "选择会员套餐、应用最优优惠券，并锁定一套可被任意 SDKWORK 桌面应用复用的高级订阅结算流。",
    eyebrow: "高级会员结算",
    freeMembershipActive: "当前为免费会员",
    membershipBalanceLabel: "会员资产",
    premiumMembershipActive: "当前为高级会员",
    readyForPremiumActivation: "已准备好开通高级会员",
    title: "订阅中心",
  },
  levelGrid: {
    empty: "当运行时提供会员等级数据后，这里会展示完整的等级对比。",
    eyebrow: "会员阶梯",
    levelFallback: "会员等级",
    title: "会员等级",
  },
  page: {
    errorTitle: "订阅中心异常",
    loading: "正在加载订阅中心...",
  },
  paymentMethods: {
    alipayLabel: "支付宝",
    appRedirectLabel: "应用跳转",
    description: "选择由商业化运行时暴露的实时支付通道。",
    desktopPayment: "桌面支付",
    eyebrow: "支付方式",
    nativeLabel: "原生支付",
    noMethods: "当运行时暴露实时支付接口后，这里会显示可用支付方式。",
    openInPaymentApp: "在支付应用中打开",
    pcWebLabel: "PC 网页",
    recommended: "推荐",
    scanToPay: "扫码支付",
    selectedState: "当前已选",
    tapToUse: "点击使用",
    wechatPayLabel: "微信支付",
  },
  planGrid: {
    benefitsEmpty: "当会员目录暴露权益亮点后，这里会显示完整权益说明。",
    benefitsEyebrow: "高级会员权益",
    benefitFallback: "会员权益",
    currentBalanceLabel: "当前余额",
    currentPlanButton: "当前方案",
    currentTag: "当前",
    entryTier: "入门层级",
    freeBaselineButton: "免费基线",
    freeMembershipDescription: "在结算前清晰比较免费版与高级版，让轻量使用场景始终保留零承诺基线。",
    freeMembershipTitle: "免费会员",
    noPlans: "当前暂无可订阅套餐。",
    noRecurringCharge: "无循环扣费",
    signInToActivatePremiumCheckout: "登录后即可开通高级会员结算",
    title: "选择高级会员套餐",
    titleEyebrow: "套餐选择",
  },
  priceSummary: {
    amountDueLabel: "应付金额",
    couponDeductionLabel: "优惠抵扣",
    originalPriceLabel: "原价",
    paymentRailLabel: "支付通道",
  },
  selectedPlan: {
    eyebrow: "已选套餐",
    fallbackDescription: "高级会员订阅套餐",
    noPlanSelectedDescription: "选择订阅方案后即可解锁结算。",
    noPlanSelectedTitle: "未选择套餐",
  },
  stageShell: {
    actionLabel: "操作类型",
    availablePlansLabel: "可选套餐",
    checkoutAmountLabel: "结算金额",
    checkoutDescription: "当前套餐已经锁定进入支付阶段，优惠券、应付金额和支付方式都会与该套餐保持同步，直到结算完成。",
    checkoutStatusDescription: "如需切换套餐，请先返回套餐阶段。",
    checkoutTitle: "锁定结算",
    couponsReadyLabel: "可用优惠",
    currentLevelLabel: "当前等级",
    descriptionLockedPackage: "返回上一阶段后可重新选择套餐，再继续结算。",
    descriptionNoPlanSelected: "请先选择一个订阅套餐后再进入结算。",
    durationLabel: "时长",
    includedPointsLabel: "赠送积分",
    lockedBadge: "已锁定套餐",
    lockedPackageLabel: "锁定套餐",
    planStageDescription: "先完成套餐比较与选择，再在真正准备支付时进入结算阶段，保持与 Sdkwork Studio 一致的高级购买节奏。",
    planStageTitle: "选择高级会员套餐",
    plannedActionLabel: "计划操作",
    priceLabel: "价格",
    purchaseStagesEyebrow: "购买阶段",
    readyDescription: "进入结算后套餐详情会被锁定，但在支付前你仍可以返回此阶段重新切换套餐。",
    readyTitle: "准备继续",
    selectedPackageLabel: "已选套餐",
    signInRequiredDescription: "登录前也可以先浏览和比较套餐，登录后即可继续结算。",
    signInRequiredTitle: "需要登录",
    stepCheckoutDescription: "锁定套餐、应用优惠并完成支付确认。",
    stepCheckoutTitle: "2. 结算支付",
    stepPlanDescription: "先比较免费版与高级版，再决定进入支付。",
    stepPlanTitle: "1. 选择套餐",
    twoStepFlow: "两步购买流",
  },
  service: {
    checkoutFailed: "订阅结算失败。",
    loadDashboardFailed: "加载订阅中心失败。",
    purchaseFailed: "购买订阅失败。",
    renewFailed: "续费订阅失败。",
    requestFailed: "请求失败。",
    selectPlanBeforeContinue: "请先选择订阅方案。",
    signInRequired: "请先登录后再管理订阅。",
    upgradeFailed: "升级订阅失败。",
  },
  status: {
    available: "可用",
    expired: "已过期",
    inactive: "未激活",
    used: "已使用",
  },
};

const SDKWORK_SUBSCRIPTION_MESSAGES: Record<SdkworkSubscriptionLocale, SdkworkSubscriptionMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkSubscriptionLocale(locale?: string | null): SdkworkSubscriptionLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkSubscriptionMessages(
  locale?: string | null,
  overrides?: SdkworkSubscriptionMessagesOverrides,
): SdkworkSubscriptionMessages {
  return mergeDeep(
    SDKWORK_SUBSCRIPTION_MESSAGES[normalizeSdkworkSubscriptionLocale(locale)],
    overrides,
  );
}
