import { describe, expect, it, vi } from "vitest";
import { createSdkworkMembershipController } from "../src";

describe("sdkwork-commerce-pc-membership controller", () => {
  it("bootstraps the membership dashboard, tracks the selected plan, and refreshes after upgrade", async () => {
    const firstDashboard = {
      benefits: [],
      levels: [],
      plans: [
        {
          description: "Best for teams",
          durationDays: 30,
          id: "membership-plan-2",
          includedPoints: 5000,
          name: "Pro Monthly",
          packageId: 2,
          priceCny: 199,
          recommended: true,
          tags: ["Popular"],
        },
      ],
      summary: {
        currentLevelName: "Pro",
        currentLevelValue: 3,
        growthValue: 180,
        isAuthenticated: true,
        isMember: true,
        pointBalance: 2400,
        remainingDays: 88,
        status: "active" as const,
        totalSpent: 399,
        upgradeGrowthValue: 500,
        points: 3200,
      },
    };
    const secondDashboard = {
      ...firstDashboard,
      summary: {
        ...firstDashboard.summary,
        remainingDays: 118,
      },
    };
    const service = {
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(firstDashboard)
        .mockResolvedValueOnce(secondDashboard),
      getEmptyDashboard: vi.fn().mockReturnValue({
        benefits: [],
        levels: [],
        plans: [],
        summary: {
          currentLevelName: "Guest",
          currentLevelValue: null,
          growthValue: null,
          isAuthenticated: false,
          isMember: false,
          pointBalance: null,
          remainingDays: null,
          status: "guest" as const,
          totalSpent: null,
          upgradeGrowthValue: null,
          points: null,
        },
      }),
      purchaseMembership: vi.fn().mockResolvedValue({
        amountCny: 199,
        orderId: "MEMBERSHIP-PURCHASE-CTRL-1",
        packageId: 2,
        status: "completed",
      }),
      renewMembership: vi.fn(),
      upgradeMembership: vi.fn().mockResolvedValue({
        amountCny: 199,
        orderId: "MEMBERSHIP-UPGRADE-CTRL-1",
        packageId: 2,
        status: "completed",
      }),
    };

    const controller = createSdkworkMembershipController({
      service,
    });

    await controller.bootstrap();
    expect(controller.getState()).toMatchObject({
      activeView: "plans",
      isBootstrapped: true,
      isLoading: false,
      selectedPlanId: 2,
    });

    controller.setView("benefits");
    expect(controller.getState().activeView).toBe("benefits");

    await controller.upgradeSelectedPlan({
      paymentMethod: "WECHAT",
    });

    expect(service.upgradeMembership).toHaveBeenCalledWith({
      packageId: 2,
      paymentMethod: "WECHAT",
    });
    expect(controller.getState().dashboard.summary.remainingDays).toBe(118);
  });

  it("purchases the selected membership package through the membership service boundary", async () => {
    const dashboard = {
      benefits: [],
      levels: [],
      plans: [
        {
          description: "Best for teams",
          durationDays: 30,
          id: "membership-package-2",
          includedPoints: 5000,
          name: "Pro Monthly",
          packageId: 2,
          priceCny: 199,
          recommended: true,
          tags: ["Popular"],
        },
      ],
      summary: {
        currentLevelName: "Free",
        currentLevelValue: null,
        growthValue: null,
        isAuthenticated: true,
        isMember: false,
        pointBalance: 100,
        remainingDays: null,
        status: "free" as const,
        totalSpent: 0,
        upgradeGrowthValue: 200,
        points: 0,
      },
    };
    const service = {
      getDashboard: vi.fn().mockResolvedValue(dashboard),
      getEmptyDashboard: vi.fn().mockReturnValue({
        benefits: [],
        levels: [],
        plans: [],
        summary: {
          currentLevelName: "Guest",
          currentLevelValue: null,
          growthValue: null,
          isAuthenticated: false,
          isMember: false,
          pointBalance: null,
          remainingDays: null,
          status: "guest" as const,
          totalSpent: null,
          upgradeGrowthValue: null,
          points: null,
        },
      }),
      purchaseMembership: vi.fn().mockResolvedValue({
        amountCny: 199,
        orderId: "MEMBERSHIP-PURCHASE-CTRL-1",
        packageId: 2,
        status: "completed",
      }),
      renewMembership: vi.fn(),
      upgradeMembership: vi.fn(),
    };
    const controller = createSdkworkMembershipController({ service });

    await controller.bootstrap();
    await controller.purchaseSelectedPlan({
      couponId: "UC-200",
      paymentMethod: "ALIPAY",
    });

    expect(service.purchaseMembership).toHaveBeenCalledWith({
      couponId: "UC-200",
      packageId: 2,
      paymentMethod: "ALIPAY",
    });
    expect(service.upgradeMembership).not.toHaveBeenCalled();
  });

  it("marks bootstrap as settled after failures to avoid tight retry loops in UI effects", async () => {
    const service = {
      getDashboard: vi.fn().mockRejectedValue(new Error("Unauthorized")),
      getEmptyDashboard: vi.fn().mockReturnValue({
        benefits: [],
        levels: [],
        plans: [],
        summary: {
          currentLevelName: "Guest",
          currentLevelValue: null,
          growthValue: null,
          isAuthenticated: false,
          isMember: false,
          pointBalance: null,
          remainingDays: null,
          status: "guest" as const,
          totalSpent: null,
          upgradeGrowthValue: null,
          points: null,
        },
      }),
      purchaseMembership: vi.fn(),
      renewMembership: vi.fn(),
      upgradeMembership: vi.fn(),
    };

    const controller = createSdkworkMembershipController({ service });

    await expect(controller.bootstrap()).rejects.toThrow(/Unauthorized/);
    expect(controller.getState()).toMatchObject({
      isBootstrapped: true,
      isLoading: false,
      lastError: "Unauthorized",
    });
  });
});
