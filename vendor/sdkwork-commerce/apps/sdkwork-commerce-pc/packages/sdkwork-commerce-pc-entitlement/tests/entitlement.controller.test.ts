import { describe, expect, it, vi } from "vitest";
import * as entitlementModule from "../src";

describe("sdkwork-commerce-pc-entitlement controller", () => {
  it("bootstraps, filters attention states, tracks selection, and preserves selection after refresh", async () => {
    const { createSdkworkEntitlementController } = entitlementModule;

    const firstDashboard = {
      decisions: [
        {
          category: "assistant",
          id: "smart-chat",
          isAvailable: true,
          isNearLimit: false,
          reasonCodes: [],
          status: "ready",
          tags: ["Core"],
          title: "Smart Chat",
        },
        {
          category: "assistant",
          id: "premium-models",
          isAvailable: false,
          isNearLimit: false,
          reasonCodes: ["minimum-level"],
          recommendedAction: {
            capability: "subscription",
            label: "Open upgrade",
            route: "/subscription?mode=upgrade",
          },
          status: "upgrade-required",
          tags: ["Premium"],
          title: "Premium Models",
        },
        {
          category: "generation",
          id: "batch-render",
          isAvailable: false,
          isNearLimit: false,
          reasonCodes: ["insufficient-points"],
          recommendedAction: {
            capability: "points",
            label: "Open recharge",
            route: "/points?section=recharge",
          },
          status: "recharge-required",
          tags: ["Credits"],
          title: "Batch Render",
        },
      ],
      digest: {
        attentionCapabilities: 2,
        limitedCapabilities: 0,
        lockedCapabilities: 0,
        readyCapabilities: 1,
        rechargeRequiredCapabilities: 1,
        totalCapabilities: 3,
        upgradeRequiredCapabilities: 1,
      },
      inventory: {
        availablePoints: 2400,
        currentLevelName: "Pro",
        currentLevelValue: 3,
        featuredOfferCount: 1,
        isAuthenticated: true,
        subscriptionPlanCount: 1,
        membershipRemainingDays: 18,
      },
      topAction: {
        capability: "subscription",
        label: "Open upgrade",
        route: "/subscription?mode=upgrade",
      },
    };
    const secondDashboard = {
      ...firstDashboard,
      decisions: firstDashboard.decisions.map((decision) =>
        decision.id === "premium-models"
          ? {
            ...decision,
            title: "Premium Models Updated",
          }
          : decision,
      ),
    };
    const service = {
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(firstDashboard)
        .mockResolvedValueOnce(secondDashboard),
      getEmptyDashboard: vi.fn().mockReturnValue({
        decisions: [],
        digest: {
          attentionCapabilities: 0,
          limitedCapabilities: 0,
          lockedCapabilities: 0,
          readyCapabilities: 0,
          rechargeRequiredCapabilities: 0,
          totalCapabilities: 0,
          upgradeRequiredCapabilities: 0,
        },
        inventory: {
          availablePoints: 0,
          currentLevelName: "Guest",
          currentLevelValue: null,
          featuredOfferCount: 0,
          isAuthenticated: false,
          subscriptionPlanCount: 0,
          membershipRemainingDays: null,
        },
        topAction: null,
      }),
    };

    const controller = createSdkworkEntitlementController({
      service,
    });

    await controller.bootstrap();
    expect(controller.getState()).toMatchObject({
      activeFilter: "all",
      isBootstrapped: true,
      isLoading: false,
      selectedCapabilityId: "smart-chat",
    });
    expect(controller.getState().visibleDecisions).toHaveLength(3);

    controller.setFilter("attention");
    expect(controller.getState().visibleDecisions.map((decision: { id: string }) => decision.id)).toEqual([
      "premium-models",
      "batch-render",
    ]);

    controller.selectCapability("premium-models");
    expect(controller.getState().selectedCapabilityId).toBe("premium-models");

    await controller.refresh();
    expect(controller.getState().selectedCapabilityId).toBe("premium-models");
    expect(controller.getState().dashboard.decisions[1]?.title).toBe("Premium Models Updated");
  });

  it("uses localized controller fallback copy when bootstrap fails without an error instance", async () => {
    const { createSdkworkEntitlementController } = entitlementModule;

    const controller = createSdkworkEntitlementController({
      locale: "zh-CN",
      service: {
        getDashboard: vi.fn().mockRejectedValue(null),
        getEmptyDashboard: vi.fn().mockReturnValue({
          decisions: [],
          digest: {
            attentionCapabilities: 0,
            limitedCapabilities: 0,
            lockedCapabilities: 0,
            readyCapabilities: 0,
            rechargeRequiredCapabilities: 0,
            totalCapabilities: 0,
            upgradeRequiredCapabilities: 0,
          },
          inventory: {
            availablePoints: 0,
            currentLevelName: "Guest",
            currentLevelValue: null,
            featuredOfferCount: 0,
            isAuthenticated: false,
            subscriptionPlanCount: 0,
            membershipRemainingDays: null,
          },
          topAction: null,
        }),
      },
    });

    await expect(controller.bootstrap()).rejects.toBeNull();
    expect(controller.getState().lastError).toBe("加载权益中心失败。");
  });
});
