import { describe, expect, it, vi } from "vitest";
import { createSdkworkCheckoutService } from "../src";

function createPricingCatalog() {
  return {
    digest: {
      currentPlanTitle: "Pro Monthly",
      highestSavingsCny: 120,
      hybridPlans: 1,
      planCount: 3,
      prepaidPlans: 1,
      recommendedPlanId: "plan-pro",
      subscriptionPlans: 1,
      usagePlans: 0,
    },
    featureMatrix: [],
    plans: [
      {
        action: {
          capability: "subscription",
          intent: "purchase",
          label: "Activate membership",
          route: "/subscription?mode=purchase&packageId=101",
        },
        bestFitFor: "Daily individual usage",
        billingModel: "subscription",
        cadence: "monthly",
        current: false,
        description: "Premium membership",
        featureValues: {},
        id: "plan-pro",
        includedPoints: 20000,
        includedUsage: "Included monthly quota",
        priceCny: 59,
        priceLabel: "59 / month",
        recommended: true,
        savingsComparedToMonthlyCny: 0,
        seatLimit: 1,
        serviceTier: "pro",
        tags: ["creator"],
        title: "Pro Monthly",
      },
      {
        action: {
          capability: "wallet",
          intent: "recharge",
          label: "Recharge wallet",
          route: "/wallet?section=recharge",
        },
        bestFitFor: "Burst launches",
        billingModel: "prepaid",
        cadence: "one-time",
        current: false,
        description: "Recharge credits",
        featureValues: {},
        id: "wallet-pack-12000",
        includedPoints: 12000,
        includedUsage: "Recharge credits",
        priceCny: 99,
        priceLabel: "99 / pack",
        recommended: false,
        savingsComparedToMonthlyCny: 0,
        seatLimit: 1,
        serviceTier: "pro",
        tags: ["credits"],
        title: "Studio Credits 12K",
      },
      {
        action: {
          capability: "offer",
          intent: "review",
          label: "Review enterprise path",
          route: "/offers?group=membership",
        },
        bestFitFor: "Security and procurement",
        billingModel: "hybrid",
        cadence: "monthly",
        current: false,
        description: "Custom bundle",
        featureValues: {},
        id: "offer-growth-suite",
        includedPoints: 0,
        includedUsage: "Bundle + advisory",
        priceCny: 199,
        priceLabel: "199 / bundle",
        recommended: false,
        savingsComparedToMonthlyCny: 0,
        seatLimit: null,
        serviceTier: "enterprise",
        tags: ["enterprise"],
        title: "Growth Suite",
      },
    ],
    summary: {
      activeSubscriptionPlans: 1,
      availablePoints: 1200,
      bestOfferSavingsCny: 120,
      budgetPosture: "watch",
      currentLevelName: "Free",
      isAuthenticated: true,
      walletBalanceCny: 12,
    },
  };
}

function createPointsDashboard() {
  return {
    plans: [],
    rechargeOffers: [
      {
        description: "Starter credits",
        id: "recharge-pack-1000",
        points: 1000,
        priceCny: 9.9,
        recommended: true,
        title: "Starter Points 1K",
      },
    ],
    summary: {
      balancePoints: 1200,
      currentPlan: {
        level: null,
        name: "Free",
        remainingDays: null,
        status: "free",
        points: null,
      },
      earnedThisMonth: 0,
      isAuthenticated: true,
      pointsToCashRate: 100,
      spentThisMonth: 0,
      totalEarned: 0,
      totalSpent: 0,
    },
    transactions: [],
  };
}

function createCouponDashboard() {
  return {
    availableCoupons: [
      {
        amountCny: 30,
        available: true,
        id: "user-coupon-subscription",
        minimumSpendCny: 50,
        name: "Launch Credit",
        remainingDays: 7,
        scopeType: "capability",
        scopeValue: "subscription",
        status: "available",
        type: "cash",
      },
      {
        amountCny: 12,
        available: true,
        id: "user-coupon-wallet",
        minimumSpendCny: 80,
        name: "Recharge Coupon",
        remainingDays: 14,
        scopeType: "capability",
        scopeValue: "wallet",
        status: "available",
        type: "cash",
      },
    ],
    catalogCoupons: [],
    catalogDigest: {
      claimableCoupons: 0,
      pointsExchangeCoupons: 0,
      totalCoupons: 0,
    },
    myCoupons: [],
    statistics: {
      expiredCount: 0,
      totalCoupons: 2,
      unusedCount: 2,
      usedCount: 0,
    },
    userDigest: {
      availableCoupons: 2,
      expiringSoonCoupons: 1,
      highestDiscountAmountCny: 30,
      totalCoupons: 2,
    },
  };
}

function createPaymentDashboard() {
  return {
    clientType: "WEB",
    digest: {
      actionablePayments: 0,
      closedPayments: 0,
      failedPayments: 0,
      successfulPayments: 0,
      timedOutPayments: 0,
      totalAmountCny: 0,
      totalPayments: 0,
    },
    methods: [
      {
        available: true,
        code: "WECHAT_PAY",
        id: "wechat-pay",
        label: "WeChat Pay",
        productTypes: [] as Array<{ code: string; name: string }>,
        recommendedProductType: "native",
        sort: 1,
      },
      {
        available: true,
        code: "ALIPAY",
        id: "alipay-pay",
        label: "Alipay",
        productTypes: [] as Array<{ code: string; name: string }>,
        recommendedProductType: "native",
        sort: 2,
      },
    ],
    records: [],
    statistics: {
      closedPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      successPayments: 0,
      timeoutPayments: 0,
      totalPayments: 0,
    },
  };
}

function createWalletOverview() {
  return {
    account: {
      availablePoints: 1200,
      cashAvailable: 12,
      cashFrozen: 0,
      experience: null,
      frozenPoints: 0,
      hasPayPassword: false,
      level: null,
      levelName: "Free",
      tokenBalance: 0,
      totalEarned: 0,
      totalPoints: 1200,
      totalSpent: 0,
    },
    isAuthenticated: true,
    pointsToCashRate: 100,
    rechargePackages: [],
    transactions: [],
  };
}

function createMembershipServiceMock() {
  const dashboard = {
    plans: [],
    inventory: {
      availableCoupons: 0,
      availablePoints: 0,
      claimableCoupons: 0,
      currentLevelName: "Guest",
      expiringSoonCoupons: 0,
      isAuthenticated: false,
      membershipRemainingDays: null,
    },
  };

  return {
    getDashboard: vi.fn().mockResolvedValue(dashboard),
    getEmptyDashboard: vi.fn().mockReturnValue(dashboard),
  };
}

describe("sdkwork-commerce-pc-checkout service", () => {
  it("composes pricing, coupons, payment methods, points recharge, and subscription submit orchestration", async () => {
    const pricingService = {
      getCatalog: vi.fn().mockResolvedValue(createPricingCatalog()),
      getEmptyCatalog: vi.fn().mockReturnValue({
        ...createPricingCatalog(),
        plans: [],
        summary: {
          ...createPricingCatalog().summary,
          isAuthenticated: false,
          walletBalanceCny: 0,
        },
      }),
    };
    const pointsService = {
      getDashboard: vi.fn().mockResolvedValue(createPointsDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue({
        ...createPointsDashboard(),
        rechargeOffers: [],
        summary: {
          ...createPointsDashboard().summary,
          isAuthenticated: false,
        },
      }),
      rechargePoints: vi.fn(),
    };
    const couponService = {
      getDashboard: vi.fn().mockResolvedValue(createCouponDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue({
        ...createCouponDashboard(),
        availableCoupons: [],
      }),
    };
    const paymentService = {
      createPayment: vi.fn().mockResolvedValue({
        amountCny: 29,
        canClose: true,
        canReconcile: true,
        canRefreshStatus: true,
        createdAt: "2026-04-03T08:00:00.000Z",
        id: "PAY-9001",
        orderId: "ORDER-9001",
        paymentMethod: "WECHAT_PAY",
        paymentOrderId: "PAY-ORDER-9001",
        paymentParams: {},
        qrContent: "wechat://qr/sdkwork-pay-9001",
        status: "pending",
        statusLabel: "Pending",
      }),
      getDashboard: vi.fn().mockResolvedValue(createPaymentDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue({
        ...createPaymentDashboard(),
        methods: [],
      }),
    };
    const walletService = {
      getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
      rechargePoints: vi.fn(),
    };
    const offerService = {
      getDashboard: vi.fn().mockResolvedValue({
        digest: {
          currentLevelName: "Free",
          featuredOffers: 1,
          highlightedSavingsCny: 120,
        },
        featuredOffers: [
          {
            action: {
              capability: "offer",
              intent: "review",
              label: "Open curated bundle",
              route: "/offers?group=membership",
            },
            description: "Operator bundle",
            estimatedSavingsCny: 120,
            group: "membership",
            id: "offer-growth-suite",
            kind: "membership-upgrade",
            pointCost: null,
            priceCny: 199,
            recommended: false,
            tags: ["enterprise"],
            title: "Growth Suite",
          },
        ],
        inventory: {
          availableCoupons: 2,
          availablePoints: 1200,
          claimableCoupons: 0,
          currentLevelName: "Free",
          expiringSoonCoupons: 1,
          isAuthenticated: true,
          membershipRemainingDays: null,
        },
      }),
      getEmptyDashboard: vi.fn().mockReturnValue({
        digest: {
          currentLevelName: "Guest",
          featuredOffers: 0,
          highlightedSavingsCny: 0,
        },
        featuredOffers: [],
        inventory: {
          availableCoupons: 0,
          availablePoints: 0,
          claimableCoupons: 0,
          currentLevelName: "Guest",
          expiringSoonCoupons: 0,
          isAuthenticated: false,
          membershipRemainingDays: null,
        },
      }),
    };
    const subscriptionService = {
      purchaseSubscription: vi.fn().mockResolvedValue({
        amountCny: 29,
        durationDays: 30,
        orderId: "ORDER-9001",
        packageId: 101,
        packageName: "Pro Monthly",
        status: "pending",
        targetLevelName: "Pro",
      }),
      renewSubscription: vi.fn(),
      upgradeSubscription: vi.fn(),
    };
    const invoiceService = {
      createInvoice: vi.fn().mockResolvedValue({
        id: "INV-9001",
        status: "draft",
        title: "SDKWORK Technology",
        totalAmountCny: 29,
        type: "electronic",
      }),
    };

    const service = createSdkworkCheckoutService({
      couponService,
      invoiceService,
      membershipService: createMembershipServiceMock(),
      offerService,
      paymentService,
      pointsService,
      pricingService,
      subscriptionService,
      walletService,
    });

    expect(service.getEmptyCatalog()).toMatchObject({
      isAuthenticated: false,
      paymentMethods: [],
      sources: [],
      userCoupons: [],
      walletBalanceCny: 0,
    });

    const catalog = await service.getCatalog();

    expect(catalog.sources.map((source: { kind: string }) => source.kind)).toEqual([
      "subscription",
      "wallet-recharge",
      "points-recharge",
      "offer-bundle",
    ]);
    expect(catalog.sources.map((source: { id: string }) => source.id)).toContain("plan-pro");
    expect(catalog.userCoupons.map((coupon: { id: string }) => coupon.id)).toEqual([
      "user-coupon-subscription",
      "user-coupon-wallet",
    ]);
    expect(catalog.userCoupons.find((coupon: { id: string }) => coupon.id === "user-coupon-wallet")).toMatchObject({
      sourceKinds: ["wallet-recharge"],
    });
    expect(catalog.paymentMethods.map((method: { id: string }) => method.id)).toEqual([
      "wechat-pay",
      "alipay-pay",
    ]);
    expect(catalog.sources.find((source: { id: string }) => source.id === "plan-pro")).toMatchObject({
      action: {
        capability: "subscription",
        intent: "purchase",
        label: "Activate membership",
        route: "/subscription?mode=purchase&packageId=101",
      },
    });
    expect(catalog.sources.find((source: { id: string }) => source.id === "wallet-pack-12000")).toMatchObject({
      action: {
        capability: "wallet",
        intent: "recharge",
        label: "Recharge wallet",
        route: "/wallet?section=recharge",
      },
    });

    const result = await service.submitCheckout({
      invoiceRequested: true,
      selectedCouponId: "user-coupon-subscription",
      selectedPaymentMethodId: "wechat-pay",
      sourceId: "plan-pro",
    });

    expect(subscriptionService.purchaseSubscription).toHaveBeenCalledWith({
      couponId: "user-coupon-subscription",
      packageId: 101,
      paymentMethod: "WECHAT",
    });
    expect(invoiceService.createInvoice).toHaveBeenCalledWith({
      title: "SDKWORK Technology",
      titleType: "company",
      totalAmountCny: 29,
      type: "electronic",
    });
    expect(paymentService.createPayment).toHaveBeenCalledWith({
      amountCny: 29,
      businessType: "subscription",
      orderId: "ORDER-9001",
      paymentMethod: "WECHAT_PAY",
    });
    expect(result).toMatchObject({
      amountCny: 29,
      invoiceId: "INV-9001",
      nextRoute: "/payments?paymentId=PAY-9001&orderId=ORDER-9001",
      orderId: "ORDER-9001",
      paymentId: "PAY-9001",
      status: "requires-payment",
    });
  });

  it("localizes checkout catalog copy and coupon scope mapping for zh-CN", async () => {
    const pricingCatalog = createPricingCatalog();
    const pointsDashboard = createPointsDashboard();
    const couponDashboard = createCouponDashboard();
    const paymentDashboard = createPaymentDashboard();

    pointsDashboard.rechargeOffers = [
      {
        ...pointsDashboard.rechargeOffers[0],
        description: "",
      },
    ];
    couponDashboard.availableCoupons = [
      {
        amountCny: 16,
        available: true,
        id: "coupon-001",
        minimumSpendCny: 80,
        name: "\u5145\u503c\u7acb\u51cf",
        remainingDays: 3,
        scopeType: "\u9002\u7528\u573a\u666f",
        scopeValue: "\u94b1\u5305",
        status: "available",
        type: "cash",
      },
    ];
    paymentDashboard.methods = [
      {
        ...paymentDashboard.methods[0],
        productTypes: [
          {
            code: "native",
            name: "Native QR",
          },
        ],
      },
    ];

    const service = createSdkworkCheckoutService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue(couponDashboard),
        getEmptyDashboard: vi.fn().mockReturnValue({
          ...couponDashboard,
          availableCoupons: [],
        }),
      },
      locale: "zh-CN",
      membershipService: createMembershipServiceMock(),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 1,
            highlightedSavingsCny: 120,
            membershipOffers: 1,
            rechargeOffers: 0,
          },
          featuredOffers: [
            {
              action: undefined,
              description: undefined,
              estimatedSavingsCny: 120,
              group: "membership",
              id: "offer-growth-suite",
              kind: "membership-upgrade",
              pointCost: null,
              priceCny: 199,
              recommended: false,
              tags: ["enterprise"],
              title: "Growth Suite",
            },
          ],
          inventory: {
            availableCoupons: 1,
            availablePoints: 1200,
            claimableCoupons: 0,
            currentLevelName: "Free",
            expiringSoonCoupons: 1,
            isAuthenticated: true,
            membershipRemainingDays: null,
          },
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "\u6e38\u5ba2",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService: {
        createPayment: vi.fn(),
        getDashboard: vi.fn().mockResolvedValue(paymentDashboard),
        getEmptyDashboard: vi.fn().mockReturnValue({
          ...paymentDashboard,
          methods: [],
        }),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue(pointsDashboard),
        getEmptyDashboard: vi.fn().mockReturnValue({
          ...pointsDashboard,
          rechargeOffers: [],
        }),
        rechargePoints: vi.fn(),
      },
      pricingService: {
        getCatalog: vi.fn().mockResolvedValue(pricingCatalog),
        getEmptyCatalog: vi.fn().mockReturnValue(pricingCatalog),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
        rechargePoints: vi.fn(),
      },
    });

    const catalog = await service.getCatalog();

    expect(catalog.invoicePolicy.title).toBe("SDKWORK \u79d1\u6280");
    expect(catalog.paymentMethods[0]).toMatchObject({
      description: "\u626b\u7801\u652f\u4ed8",
    });
    expect(catalog.sources.find((source: { id: string }) => source.id === "plan-pro")).toMatchObject({
      billingLabel: "\u6309\u6708\u8ba2\u9605",
      unitLabel: "\u5e2d\u4f4d",
    });
    expect(catalog.sources.find((source: { id: string }) => source.id === "wallet-pack-12000")).toMatchObject({
      billingLabel: "\u5355\u6b21\u5145\u503c",
      unitLabel: "\u79ef\u5206",
    });
    expect(catalog.sources.find((source: { id: string }) => source.id === "recharge-pack-1000")).toMatchObject({
      action: {
        label: "\u5145\u503c\u79ef\u5206",
      },
      billingLabel: "\u79ef\u5206\u5145\u503c",
      description: "\u8865\u5145\u79ef\u5206\u989d\u5ea6",
      unitLabel: "\u79ef\u5206",
    });
    expect(catalog.sources.find((source: { id: string }) => source.id === "offer-growth-suite")).toMatchObject({
      action: {
        label: "\u67e5\u770b\u7cbe\u9009\u7ec4\u5408",
      },
      billingLabel: "\u7cbe\u9009\u7ec4\u5408",
      description: "\u7cbe\u9009\u5546\u4e1a\u5316\u65b9\u6848",
      unitLabel: "\u7ec4\u5408",
    });
    expect(catalog.userCoupons).toEqual([
      expect.objectContaining({
        id: "coupon-001",
        sourceKinds: ["wallet-recharge"],
      }),
    ]);
  });

  it("rejects paid checkout submissions that do not have a selected payment method", async () => {
    const paymentService = {
      createPayment: vi.fn(),
      getDashboard: vi.fn().mockResolvedValue({
        ...createPaymentDashboard(),
        methods: [],
      }),
      getEmptyDashboard: vi.fn().mockReturnValue({
        ...createPaymentDashboard(),
        methods: [],
      }),
    };
    const pointsService = {
      getDashboard: vi.fn().mockResolvedValue(createPointsDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue(createPointsDashboard()),
      rechargePoints: vi.fn(),
    };

    const service = createSdkworkCheckoutService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue(createCouponDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createCouponDashboard()),
      },
      membershipService: createMembershipServiceMock(),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          ...createPricingCatalog(),
          featuredOffers: [],
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "Guest",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService,
      pointsService,
      pricingService: {
        getCatalog: vi.fn().mockResolvedValue({
          ...createPricingCatalog(),
          plans: [],
        }),
        getEmptyCatalog: vi.fn().mockReturnValue(createPricingCatalog()),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
        rechargePoints: vi.fn(),
      },
    });

    await expect(
      service.submitCheckout({
        sourceId: "recharge-pack-1000",
      }),
    ).rejects.toThrow("Select a payment method before submitting checkout.");
    expect(pointsService.rechargePoints).not.toHaveBeenCalled();
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it("uses localized submit validation messages for zh-CN", async () => {
    const paymentService = {
      createPayment: vi.fn(),
      getDashboard: vi.fn().mockResolvedValue({
        ...createPaymentDashboard(),
        methods: [],
      }),
      getEmptyDashboard: vi.fn().mockReturnValue({
        ...createPaymentDashboard(),
        methods: [],
      }),
    };
    const pointsService = {
      getDashboard: vi.fn().mockResolvedValue(createPointsDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue(createPointsDashboard()),
      rechargePoints: vi.fn(),
    };

    const service = createSdkworkCheckoutService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue(createCouponDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createCouponDashboard()),
      },
      locale: "zh-CN",
      membershipService: createMembershipServiceMock(),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          ...createPricingCatalog(),
          featuredOffers: [],
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "\u6e38\u5ba2",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService,
      pointsService,
      pricingService: {
        getCatalog: vi.fn().mockResolvedValue({
          ...createPricingCatalog(),
          plans: [],
        }),
        getEmptyCatalog: vi.fn().mockReturnValue(createPricingCatalog()),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
        rechargePoints: vi.fn(),
      },
    });

    await expect(
      service.submitCheckout({
        sourceId: "recharge-pack-1000",
      }),
    ).rejects.toThrow("\u8bf7\u5148\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f\uff0c\u518d\u63d0\u4ea4\u7ed3\u7b97\u3002");
    expect(pointsService.rechargePoints).not.toHaveBeenCalled();
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it("preserves failed submit states instead of collapsing them into pending", async () => {
    const subscriptionService = {
      purchaseSubscription: vi.fn().mockResolvedValue({
        amountCny: 59,
        orderId: undefined,
        packageId: 101,
        packageName: "Pro Monthly",
        status: "failed",
        targetLevelName: "Pro",
      }),
      renewSubscription: vi.fn(),
      upgradeSubscription: vi.fn(),
    };
    const paymentService = {
      createPayment: vi.fn(),
      getDashboard: vi.fn().mockResolvedValue(createPaymentDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue(createPaymentDashboard()),
    };

    const service = createSdkworkCheckoutService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue(createCouponDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createCouponDashboard()),
      },
      membershipService: createMembershipServiceMock(),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "Guest",
            expiringSoonCoupons: 0,
            isAuthenticated: true,
            membershipRemainingDays: null,
          },
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "Guest",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService,
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue(createPointsDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createPointsDashboard()),
        rechargePoints: vi.fn(),
      },
      pricingService: {
        getCatalog: vi.fn().mockResolvedValue(createPricingCatalog()),
        getEmptyCatalog: vi.fn().mockReturnValue(createPricingCatalog()),
      },
      subscriptionService,
      walletService: {
        getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
        rechargePoints: vi.fn(),
      },
    });

    const result = await service.submitCheckout({
      selectedPaymentMethodId: "wechat-pay",
      sourceId: "plan-pro",
    });

    expect(result).toMatchObject({
      amountCny: 29,
      status: "failed",
    });
    expect(result.nextRoute).toBeUndefined();
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it("rejects subscription sources that do not expose a valid packageId in the shared action route", async () => {
    const pricingCatalog = createPricingCatalog();
    pricingCatalog.plans = pricingCatalog.plans.map((plan) => (
      plan.id === "plan-pro"
        ? {
            ...plan,
            action: {
              ...plan.action,
              route: "/subscription?mode=purchase",
            },
          }
        : plan
    ));
    const subscriptionService = {
      purchaseSubscription: vi.fn(),
      renewSubscription: vi.fn(),
      upgradeSubscription: vi.fn(),
    };

    const service = createSdkworkCheckoutService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue(createCouponDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createCouponDashboard()),
      },
      membershipService: createMembershipServiceMock(),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "Guest",
            expiringSoonCoupons: 0,
            isAuthenticated: true,
            membershipRemainingDays: null,
          },
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
          inventory: {
            availableCoupons: 0,
            availablePoints: 0,
            claimableCoupons: 0,
            currentLevelName: "Guest",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService: {
        createPayment: vi.fn(),
        getDashboard: vi.fn().mockResolvedValue(createPaymentDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createPaymentDashboard()),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue(createPointsDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createPointsDashboard()),
        rechargePoints: vi.fn(),
      },
      pricingService: {
        getCatalog: vi.fn().mockResolvedValue(pricingCatalog),
        getEmptyCatalog: vi.fn().mockReturnValue(pricingCatalog),
      },
      subscriptionService,
      walletService: {
        getOverview: vi.fn().mockResolvedValue(createWalletOverview()),
        rechargePoints: vi.fn(),
      },
    });

    await expect(
      service.submitCheckout({
        selectedPaymentMethodId: "wechat-pay",
        sourceId: "plan-pro",
      }),
    ).rejects.toThrow("Subscription checkout source is missing a valid packageId.");
    expect(subscriptionService.purchaseSubscription).not.toHaveBeenCalled();
  });
});
