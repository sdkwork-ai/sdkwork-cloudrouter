import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import { createSdkworkMembershipService } from "../src";

const proLevelIcon = {
  kind: "image",
  publicUrl: "https://cdn.sdkwork.ai/memberships/pro.png",
  source: "external_url",
  url: "https://cdn.sdkwork.ai/memberships/pro.png",
} as const;

describe("sdkwork-commerce-pc-membership service", () => {
  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "membership-auth-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("maps membership plans, benefits, and packages into a reusable membership dashboard", async () => {
    const commerceService = createCommerceServiceMock({
      memberships: {
        current: {
          retrieve: vi.fn().mockResolvedValue({
            code: "2000",
            data: {
              expireTime: "2026-06-30T00:00:00.000Z",
              growthValue: 180,
              remainingDays: 88,
              totalSpent: 399,
              upgradeGrowthValue: 500,
              planRank: 3,
              planName: "Pro",
              points: 3200,
              membershipStatus: "ACTIVE",
            },
          }),
          status: {
            retrieve: vi.fn().mockResolvedValue({
              code: "2000",
              data: {
                isMember: true,
                pointBalance: 2400,
                planRank: 3,
              },
            }),
          },
        },
        benefits: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: [
              {
                benefitKey: "priority-rendering",
                claimed: true,
                description: "Jump the queue for premium workloads.",
                id: 2,
                name: "Priority rendering",
                type: "quota",
                usageLimit: 10,
                usedCount: 2,
              },
              {
                benefitKey: "membership-support",
                claimed: false,
                description: "Priority support responses.",
                id: 1,
                name: "Priority support",
                type: "service",
                usageLimit: 1,
                usedCount: 0,
              },
            ],
          }),
        },
        plans: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: [
              {
                description: "Entry tier",
                id: 1,
                levelValue: 1,
                name: "Free",
                requiredPoints: 0,
              },
              {
                description: "Professional tier",
                icon: proLevelIcon,
                id: 3,
                levelValue: 3,
                name: "Pro",
                requiredPoints: 500,
              },
              {
                description: "Growing teams",
                id: 2,
                levelValue: 2,
                name: "Plus",
                requiredPoints: 200,
              },
            ],
          }),
        },
        packages: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: [
              {
                description: "Best for teams",
                id: 2,
                levelName: "Pro",
                name: "Pro Monthly",
                originalPrice: 249,
                pointAmount: 5000,
                price: 199,
                recommended: true,
                sortWeight: 20,
                tags: ["Popular"],
                durationDays: 30,
              },
              {
                description: "Long-running annual plan",
                id: 3,
                levelName: "Pro",
                name: "Pro Annual",
                originalPrice: 899,
                pointAmount: 60000,
                price: 699,
                recommended: false,
                sortWeight: 15,
                tags: ["Annual"],
                durationDays: 365,
              },
            ],
          }),
        },
      },
    });

    const service = createSdkworkMembershipService({
      commerceService,
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.summary).toMatchObject({
      currentLevelName: "Pro",
      isAuthenticated: true,
      isMember: true,
      points: 3200,
      remainingDays: 88,
      status: "active",
    });
    expect(
      dashboard.levels.map((level) => ({
        isCurrent: level.isCurrent,
        name: level.name,
      })),
    ).toEqual([
      { isCurrent: false, name: "Free" },
      { isCurrent: false, name: "Plus" },
      { isCurrent: true, name: "Pro" },
    ]);
    expect(dashboard.levels[2].icon).toEqual(proLevelIcon);
    expect(dashboard.benefits[0]).toMatchObject({
      claimed: true,
      id: "membership-benefit-2",
      name: "Priority rendering",
      usedCount: 2,
    });
    expect(dashboard.plans[0]).toMatchObject({
      name: "Pro Monthly",
      packageId: 2,
      recommended: true,
    });
  });

  it("returns a guest-safe membership dashboard with public package plans when the wallet overview is anonymous", async () => {
    resetCommerceServiceMockSession();
    const packagesList = vi.fn().mockResolvedValue({
      code: "2000",
      data: [
        {
          description: "Starter public plan",
          id: 1,
          levelName: "Plus",
          name: "Plus Monthly",
          originalPrice: 99,
          pointAmount: 1200,
          price: 39,
          recommended: true,
          tags: ["Starter"],
          durationDays: 30,
        },
      ],
    });
    const service = createSdkworkMembershipService({
      commerceService: createCommerceServiceMock({
        memberships: {
          packages: {
            list: packagesList,
          },
        },
      }),
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.summary.isAuthenticated).toBe(false);
    expect(dashboard.summary.status).toBe("guest");
    expect(dashboard.levels).toEqual([]);
    expect(dashboard.benefits).toEqual([]);
    expect(dashboard.plans).toEqual([
      expect.objectContaining({
        name: "Plus Monthly",
        packageId: 1,
        recommended: true,
      }),
    ]);
    expect(packagesList).toHaveBeenCalledTimes(1);
  });

  it("purchases, renews, and upgrades membership through the generated SDK boundary", async () => {
    const purchase = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: 199,
        durationDays: 30,
        orderId: "MEMBERSHIP-PURCHASE-2",
        packageId: 2,
        packageName: "Pro Monthly",
        status: "SUCCESS",
        targetLevelName: "Pro",
      },
    });
    const renew = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: 399,
        durationDays: 365,
        orderId: "MEMBERSHIP-RENEW-2",
        packageId: 3,
        packageName: "Pro Annual",
        status: "SUCCESS",
        targetLevelName: "Pro",
      },
    });
    const upgrade = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: 199,
        durationDays: 30,
        orderId: "MEMBERSHIP-UPGRADE-2",
        packageId: 2,
        packageName: "Pro Monthly",
        status: "SUCCESS",
        targetLevelName: "Pro",
      },
    });
    const commerceService = createCommerceServiceMock({
      memberships: {
        purchases: {
          create: purchase,
          renew,
          upgrade,
        },
      },
    });
    const service = createSdkworkMembershipService({
      commerceService,
    });

    await expect(
      service.purchaseMembership({
        packageId: 2,
        paymentMethod: "WECHAT",
      }),
    ).resolves.toMatchObject({
      amountCny: 199,
      orderId: "MEMBERSHIP-PURCHASE-2",
      packageId: 2,
      status: "completed",
    });

    await expect(
      service.upgradeMembership({
        packageId: 2,
        paymentMethod: "WECHAT",
      }),
    ).resolves.toMatchObject({
      amountCny: 199,
      orderId: "MEMBERSHIP-UPGRADE-2",
      packageId: 2,
      status: "completed",
    });

    await expect(
      service.renewMembership({
        packageId: 3,
        paymentMethod: "ALIPAY",
      }),
    ).resolves.toMatchObject({
      amountCny: 399,
      orderId: "MEMBERSHIP-RENEW-2",
      packageId: 3,
      status: "completed",
    });

    expect(upgrade).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 2,
      paymentMethod: "WECHAT",
    });
    expect(purchase).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 2,
      paymentMethod: "WECHAT",
    });
    expect(renew).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 3,
      paymentMethod: "ALIPAY",
    });
  });

  it("localizes membership auth and mutation fallback errors at the membership boundary", async () => {
    resetCommerceServiceMockSession();
    const localizedAuthService = createSdkworkMembershipService({
      locale: "zh-CN",
      messages: {
        service: {
          signInRequired: "Please sign in before managing memberships.",
        },
      },
    });

    await expect(
      localizedAuthService.purchaseMembership({
        packageId: 2,
      }),
    ).rejects.toThrow("Please sign in before managing memberships.");

    configureCommerceServiceMockSession({ authToken: "membership-auth-token" });
    const localizedMutationService = createSdkworkMembershipService({
      commerceService: createCommerceServiceMock({
        memberships: {
          purchases: {
            create: vi.fn().mockResolvedValue({
              code: "5000",
            }),
          },
        },
      }),
      locale: "zh-CN",
      messages: {
        service: {
          purchaseFailed: "Membership purchase failed.",
        },
      },
    });

    await expect(
      localizedMutationService.purchaseMembership({
        packageId: 2,
      }),
    ).rejects.toThrow("Membership purchase failed.");
  });
});
