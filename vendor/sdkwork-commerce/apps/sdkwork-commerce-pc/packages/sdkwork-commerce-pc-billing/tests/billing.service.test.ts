import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import * as billingModule from "../src";

describe("sdkwork-commerce-pc-billing service", () => {
  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "billing-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("returns a guest-safe empty billing dashboard when the wallet session is anonymous", async () => {
    const { createSdkworkBillingService } = billingModule;

    resetCommerceServiceMockSession();
    const service = createSdkworkBillingService({
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          account: {
            availablePoints: 0,
            cashAvailable: 0,
            cashFrozen: 0,
            experience: null,
            frozenPoints: 0,
            hasPayPassword: false,
            level: null,
            tokenBalance: 0,
            totalEarned: 0,
            totalPoints: 0,
            totalSpent: 0,
          },
          isAuthenticated: false,
          pointsToCashRate: null,
          rechargePackages: [],
          transactions: [],
        }),
      },
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.posture).toBe("healthy");
    expect(dashboard.digest).toEqual({
      budgetAmountCny: 200,
      budgetRemainingCny: 200,
      monthSpendCny: 0,
      outstandingAmountCny: 0,
      projectedMonthSpendCny: 0,
      savingsOpportunityCny: 0,
      todaySpendCny: 0,
    });
    expect(dashboard.summary).toEqual({
      activeSubscriptionPlans: 0,
      availablePoints: 0,
      bestOfferSavingsCny: 0,
      currentLevelName: "Guest",
      totalSpentCny: null,
    });
    expect(dashboard.topAction).toBeNull();
    expect(dashboard.recentUsage).toEqual([]);
  });

  it("composes spend, budget pressure, invoice attention, and actionable payments into one billing dashboard and prioritizes payment routing", async () => {
    const { createSdkworkBillingService } = billingModule;

    const service = createSdkworkBillingService({
      budgetPolicy: {
        budgetAmountCny: 120,
        warningThreshold: 0.75,
      },
      invoiceService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 1,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 1,
            totalAmountCny: 199,
            totalInvoices: 1,
          },
          invoices: [
            {
              canCancel: false,
              canDownload: false,
              canEdit: false,
              canSubmit: true,
              createdAt: "2026-04-15T06:30:00.000Z",
              currency: "CNY",
              id: "INV-9001",
              status: "draft",
              statusLabel: "Draft",
              title: "SDKWORK Technology",
              titleType: "company",
              totalAmountCny: 199,
              type: "electronic",
              updatedAt: "2026-04-15T06:30:00.000Z",
            },
          ],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 1,
            totalAmountCny: 199,
            totalInvoices: 1,
          },
        }),
      },
      loadUsageRecords: vi.fn().mockResolvedValue([
        {
          capability: "chat",
          costCny: 60,
          id: "usage-1",
          model: "GPT-5.4",
          provider: "openai",
          title: "GPT-5.4",
          unitLabel: "tokens",
          units: 240000,
          usageAt: "2026-04-10T09:00:00.000Z",
          workspace: "studio",
        },
        {
          capability: "chat",
          costCny: 25,
          id: "usage-2",
          model: "Claude Sonnet 4.5",
          provider: "anthropic",
          title: "Claude Sonnet 4.5",
          unitLabel: "tokens",
          units: 120000,
          usageAt: "2026-04-15T07:00:00.000Z",
          workspace: "studio",
        },
        {
          capability: "rtc",
          costCny: 15,
          id: "usage-3",
          model: "Realtime Minutes",
          provider: "rtc-cloud",
          title: "Realtime Minutes",
          unitLabel: "minutes",
          units: 80,
          usageAt: "2026-04-15T08:00:00.000Z",
          workspace: "meetings",
        },
      ]),
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 1,
            highlightedSavingsCny: 300,
            membershipOffers: 1,
            rechargeOffers: 0,
          },
          featuredOffers: [
            {
              action: {
                capability: "subscription",
                intent: "upgrade",
                label: "Open upgrade",
                route: "/subscription?mode=upgrade&packageId=3",
              },
              estimatedSavingsCny: 300,
              group: "membership",
              id: "offer-membership-3",
              kind: "membership-upgrade",
              priceCny: 699,
              recommended: true,
              tags: ["Annual"],
              title: "Pro Annual",
            },
          ],
          inventory: {
            availableCoupons: 0,
            availablePoints: 2400,
            claimableCoupons: 0,
            currentLevelName: "Pro",
            expiringSoonCoupons: 0,
            isAuthenticated: true,
            membershipRemainingDays: 18,
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
        getDashboard: vi.fn().mockResolvedValue({
          clientType: "WEB",
          digest: {
            actionablePayments: 2,
            closedPayments: 0,
            failedPayments: 0,
            successfulPayments: 0,
            timedOutPayments: 0,
            totalAmountCny: 90,
            totalPayments: 2,
          },
          methods: [
            {
              available: true,
              code: "WECHAT_PAY",
              id: "wechat-pay",
              label: "WeChat Pay",
              productTypes: [],
              recommendedProductType: "native",
              sort: 100,
            },
          ],
          records: [
            {
              amountCny: 60,
              canClose: true,
              canReconcile: true,
              canRefreshStatus: true,
              createdAt: "2026-04-15T08:30:00.000Z",
              id: "PAY-9001",
              orderId: "ORDER-9001",
              paymentMethod: "WECHAT_PAY",
              paymentProvider: "WECHAT_PAY",
              paymentSn: "PAYMENT-9001",
              status: "pending",
              statusLabel: "Pending",
            },
            {
              amountCny: 30,
              canClose: true,
              canReconcile: true,
              canRefreshStatus: true,
              createdAt: "2026-04-15T07:30:00.000Z",
              id: "PAY-9002",
              orderId: "ORDER-9002",
              paymentMethod: "ALIPAY",
              paymentProvider: "ALIPAY",
              paymentSn: "PAYMENT-9002",
              status: "default",
              statusLabel: "Unpaid",
            },
          ],
          statistics: {
            closedPayments: 0,
            failedPayments: 0,
            pendingPayments: 1,
            successPayments: 0,
            timeoutPayments: 0,
            totalPayments: 2,
          },
        }),
      },
      subscriptionService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [],
          checkout: {
            action: "upgrade",
            discountAmountCny: 0,
            originalAmountCny: 699,
            payableAmountCny: 699,
            selectedCouponId: null,
            selectedPackageId: 3,
            selectedPaymentMethod: "WECHAT",
          },
          coupons: [],
          levels: [],
          plans: [
            {
              durationDays: 365,
              id: "membership-plan-3",
              includedPoints: 60000,
              name: "Pro Annual",
              packageId: 3,
              priceCny: 699,
              recommended: true,
              tags: ["Annual"],
            },
          ],
          summary: {
            currentLevelName: "Pro",
            currentLevelValue: 3,
            growthValue: 180,
            isAuthenticated: true,
            isMember: true,
            pointBalance: 2400,
            remainingDays: 18,
            status: "active",
            totalSpent: 399,
            upgradeGrowthValue: 500,
            points: 3200,
          },
        }),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          account: {
            availablePoints: 2400,
            cashAvailable: 0,
            cashFrozen: 0,
            experience: 18,
            frozenPoints: 0,
            hasPayPassword: true,
            level: 3,
            tokenBalance: 0,
            totalEarned: 6400,
            totalPoints: 2400,
            totalSpent: 4000,
          },
          isAuthenticated: true,
          pointsToCashRate: 100,
          rechargePackages: [],
          transactions: [],
        }),
      },
    });

    const dashboard = await service.getDashboard({
      referenceDate: "2026-04-15T12:00:00.000Z",
    });

    expect(dashboard.posture).toBe("payment-attention");
    expect(dashboard.digest).toEqual({
      budgetAmountCny: 120,
      budgetRemainingCny: 20,
      monthSpendCny: 100,
      outstandingAmountCny: 90,
      projectedMonthSpendCny: 200,
      savingsOpportunityCny: 300,
      todaySpendCny: 40,
    });
    expect(dashboard.summary).toEqual({
      activeSubscriptionPlans: 1,
      availablePoints: 2400,
      bestOfferSavingsCny: 300,
      currentLevelName: "Pro",
      totalSpentCny: 399,
    });
    expect(dashboard.paymentAttention).toMatchObject({
      actionablePayments: 2,
      availablePaymentMethods: 1,
      outstandingAmountCny: 90,
    });
    expect(dashboard.invoiceAttention).toMatchObject({
      actionableInvoices: 1,
      pendingInvoices: 1,
    });
    expect(dashboard.breakdowns.provider[0]).toMatchObject({
      costCny: 60,
      id: "openai",
    });
    expect(dashboard.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payment-attention",
        }),
        expect.objectContaining({
          id: "projected-budget-overrun",
        }),
      ]),
    );
    expect(dashboard.topAction).toEqual({
      capability: "payment",
      intent: "resolve",
      label: "Resolve payment attention",
      reason: "payment-attention",
      route: "/payments?filter=actionable",
    });
  });

  it("uses localized billing service defaults for zh-CN dashboards and sparse usage records", async () => {
    const { createSdkworkBillingService } = billingModule;

    const service = createSdkworkBillingService({
      commerceService: createCommerceServiceMock({
        billing: {
          history: {
            list: vi.fn().mockResolvedValue({
              code: "2000",
              data: {
                content: [
                  {
                    costAmount: 12,
                    id: "usage-zh-1",
                    usageAt: "2026-04-15T07:00:00.000Z",
                  },
                ],
              },
            }),
          },
        },
      }),
      invoiceService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 0,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
          invoices: [],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
        }),
      },
      locale: "zh-CN",
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
            currentLevelName: "",
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
            currentLevelName: "",
            expiringSoonCoupons: 0,
            isAuthenticated: false,
            membershipRemainingDays: null,
          },
        }),
      },
      paymentService: {
        getDashboard: vi.fn().mockResolvedValue({
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
          methods: [],
          records: [],
          statistics: {
            closedPayments: 0,
            failedPayments: 0,
            pendingPayments: 0,
            successPayments: 0,
            timeoutPayments: 0,
            totalPayments: 0,
          },
        }),
      },
      subscriptionService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [],
          checkout: null,
          coupons: [],
          levels: [],
          plans: [],
          summary: {
            currentLevelName: "",
            currentLevelValue: null,
            growthValue: null,
            isAuthenticated: true,
            isMember: false,
            pointBalance: 0,
            remainingDays: null,
            status: "free",
            totalSpent: null,
            upgradeGrowthValue: null,
            points: null,
          },
        }),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          account: {
            availablePoints: 0,
            cashAvailable: 0,
            cashFrozen: 0,
            experience: null,
            frozenPoints: 0,
            hasPayPassword: false,
            level: null,
            tokenBalance: 0,
            totalEarned: 0,
            totalPoints: 0,
            totalSpent: 0,
          },
          isAuthenticated: true,
          pointsToCashRate: null,
          rechargePackages: [],
          transactions: [],
        }),
      },
    });

    expect(service.getEmptyDashboard().summary.currentLevelName).toBe("\u8bbf\u5ba2");

    const dashboard = await service.getDashboard({
      referenceDate: "2026-04-15T12:00:00.000Z",
    });

    expect(dashboard.summary.currentLevelName).toBe("\u8bbf\u5ba2");
    expect(dashboard.recentUsage[0]).toMatchObject({
      capability: "\u901a\u7528",
      model: "\u672a\u77e5\u6a21\u578b",
      provider: "\u672a\u5206\u7c7b",
      title: "\u7528\u91cf\u8bb0\u5f55",
      unitLabel: "\u5355\u4f4d",
      workspace: "\u9ed8\u8ba4\u5de5\u4f5c\u533a",
    });
  });
});
