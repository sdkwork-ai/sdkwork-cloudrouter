import { describe, expect, it, vi } from "vitest";
import * as entitlementModule from "../src";

describe("sdkwork-commerce-pc-entitlement service", () => {
  it("returns a guest-safe locked dashboard with offer routing when the wallet session is anonymous", async () => {
    const { createSdkworkEntitlementService } = entitlementModule;

    const service = createSdkworkEntitlementService({
      descriptors: [
        {
          category: "assistant",
          description: "Premium model access",
          id: "premium-models",
          minimumLevelValue: 2,
          title: "Premium Models",
        },
      ],
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          isAuthenticated: false,
        }),
      },
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.decisions).toContainEqual(
      expect.objectContaining({
        id: "premium-models",
        recommendedAction: {
          capability: "offer",
          intent: "review",
          route: "/offers?group=membership",
          label: "Explore access options",
        },
        status: "locked",
      }),
    );
    expect(dashboard.digest).toEqual({
      attentionCapabilities: 1,
      limitedCapabilities: 0,
      lockedCapabilities: 1,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 0,
      totalCapabilities: 1,
      upgradeRequiredCapabilities: 0,
    });
    expect(dashboard.inventory).toEqual({
      availablePoints: 0,
      currentLevelName: "Guest",
      currentLevelValue: null,
      featuredOfferCount: 0,
      isAuthenticated: false,
      subscriptionPlanCount: 0,
      membershipRemainingDays: null,
    });
    expect(dashboard.topAction).toEqual({
      capability: "offer",
      intent: "review",
      label: "Explore access options",
      route: "/offers?group=membership",
    });
  });

  it("composes upgrade, recharge, and limited decisions into one entitlement dashboard and prioritizes the strongest commercial action", async () => {
    const { createSdkworkEntitlementService } = entitlementModule;

    const service = createSdkworkEntitlementService({
      descriptors: [
        {
          category: "assistant",
          description: "Top-tier reasoning models",
          id: "premium-models",
          minimumLevelValue: 5,
          title: "Premium Models",
        },
        {
          category: "generation",
          description: "Fast high-volume rendering",
          id: "batch-render",
          minimumPointsBalance: 5000,
          title: "Batch Render",
        },
        {
          category: "automation",
          description: "Near-limit automation runs",
          id: "agent-automation",
          quotaLimit: 100,
          quotaUsed: 86,
          title: "Agent Automation",
          warningThreshold: 0.8,
        },
      ],
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 3,
            highlightedSavingsCny: 300,
            membershipOffers: 2,
            rechargeOffers: 1,
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
            isAuthenticated: true,
            membershipRemainingDays: 18,
          },
        }),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue({
          plans: [],
          rechargeOffers: [],
          summary: {
            balancePoints: 2400,
            currentPlan: {
              level: 3,
              name: "Pro",
              remainingDays: 18,
              status: "active",
              points: 3200,
            },
            earnedThisMonth: 1200,
            isAuthenticated: true,
            pointsToCashRate: 100,
            spentThisMonth: 300,
            totalEarned: 6400,
            totalSpent: 4000,
          },
          transactions: [],
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
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [],
          levels: [],
          plans: [],
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
          isAuthenticated: true,
        }),
      },
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.digest).toEqual({
      attentionCapabilities: 3,
      limitedCapabilities: 1,
      lockedCapabilities: 0,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 1,
      totalCapabilities: 3,
      upgradeRequiredCapabilities: 1,
    });
    expect(dashboard.inventory).toMatchObject({
      availablePoints: 2400,
      currentLevelName: "Pro",
      currentLevelValue: 3,
      featuredOfferCount: 1,
      isAuthenticated: true,
      subscriptionPlanCount: 1,
      membershipRemainingDays: 18,
    });
    expect(dashboard.topAction).toEqual({
      capability: "subscription",
      intent: "upgrade",
      label: "Open upgrade",
      route: "/subscription?mode=upgrade",
    });
    expect(dashboard.decisions).toContainEqual(
      expect.objectContaining({
        id: "premium-models",
        status: "upgrade-required",
      }),
    );
    expect(dashboard.decisions).toContainEqual(
      expect.objectContaining({
        id: "batch-render",
        recommendedAction: {
          capability: "points",
          intent: "recharge",
          label: "Open recharge",
          route: "/points?section=recharge",
        },
        status: "recharge-required",
      }),
    );
    expect(dashboard.decisions).toContainEqual(
      expect.objectContaining({
        id: "agent-automation",
        remainingQuota: 14,
        status: "limited",
      }),
    );
  });

  it("localizes guest dashboards and service-generated actions for Chinese workspaces", async () => {
    const { createSdkworkEntitlementService } = entitlementModule;

    const guestService = createSdkworkEntitlementService({
      descriptors: [
        {
          category: "assistant",
          description: "Premium model access",
          id: "premium-models",
          minimumLevelValue: 2,
          title: "Premium Models",
        },
      ],
      locale: "zh-CN",
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          isAuthenticated: false,
        }),
      },
    });

    await expect(guestService.getDashboard()).resolves.toMatchObject({
      inventory: {
        currentLevelName: "访客",
      },
      topAction: {
        label: "查看访问方案",
      },
    });

    const localizedService = createSdkworkEntitlementService({
      descriptors: [
        {
          category: "assistant",
          description: "Top-tier reasoning models",
          id: "premium-models",
          minimumLevelValue: 5,
          title: "Premium Models",
        },
        {
          category: "generation",
          description: "Fast high-volume rendering",
          id: "batch-render",
          minimumPointsBalance: 5000,
          title: "Batch Render",
        },
        {
          category: "automation",
          description: "Near-limit automation runs",
          id: "agent-automation",
          quotaLimit: 100,
          quotaUsed: 86,
          title: "Agent Automation",
          warningThreshold: 0.8,
        },
      ],
      locale: "zh-CN",
      offerService: {
        getDashboard: vi.fn().mockResolvedValue({
          featuredOffers: [],
          inventory: {
            currentLevelName: "Pro",
          },
        }),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue({
          summary: {
            balancePoints: 2400,
          },
        }),
      },
      subscriptionService: {
        getDashboard: vi.fn().mockResolvedValue({
          plans: [
            {
              id: "membership-plan-3",
            },
          ],
        }),
      },
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          summary: {
            currentLevelName: "Pro",
            currentLevelValue: 3,
            remainingDays: 18,
          },
        }),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          isAuthenticated: true,
        }),
      },
    });

    const dashboard = await localizedService.getDashboard();

    expect(dashboard.topAction).toMatchObject({
      label: "打开升级",
    });
    expect(dashboard.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "premium-models",
          recommendedAction: expect.objectContaining({
            label: "打开升级",
          }),
        }),
        expect.objectContaining({
          id: "batch-render",
          recommendedAction: expect.objectContaining({
            label: "打开充值",
          }),
        }),
        expect.objectContaining({
          id: "agent-automation",
          recommendedAction: expect.objectContaining({
            label: "查看升级方案",
          }),
        }),
      ]),
    );
  });
});
