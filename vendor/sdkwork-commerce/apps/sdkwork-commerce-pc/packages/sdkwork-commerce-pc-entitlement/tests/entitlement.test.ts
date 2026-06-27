import { describe, expect, it } from "vitest";
import * as entitlementModule from "../src";

describe("sdkwork-commerce-pc-entitlement headless contract", () => {
  it("creates reusable manifests, route intents, starter catalogs, decisions, and digests", () => {
    const {
      createEntitlementRouteIntent,
      createEntitlementWorkspaceManifest,
      createSdkworkEntitlementCatalog,
      createSdkworkStarterEntitlementCatalog,
      entitlementPackageMeta,
      evaluateSdkworkEntitlementDecision,
      summarizeSdkworkEntitlementDecisions,
    } = entitlementModule;

    expect(entitlementPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-entitlement",
    });

    expect(
      createEntitlementWorkspaceManifest({
        title: "Entitlements",
      }),
    ).toMatchObject({
      capability: "entitlement",
      packageNames: [
        "@sdkwork/commerce-pc-entitlement",
        "@sdkwork/commerce-pc-offer",
        "@sdkwork/commerce-pc-points",
        "@sdkwork/commerce-pc-subscription",
        "@sdkwork/commerce-pc-membership",
        "@sdkwork/commerce-pc-wallet",
      ],
      routePath: "/entitlements",
      title: "Entitlements",
    });

    expect(
      createEntitlementRouteIntent({
        capabilityId: "premium-models",
        filter: "attention",
      }),
    ).toEqual({
      capabilityId: "premium-models",
      filter: "attention",
      focusWindow: true,
      route: "/entitlements?filter=attention&capabilityId=premium-models",
      source: "entitlement-workspace",
      type: "entitlement-route-intent",
    });

    expect(
      createSdkworkEntitlementCatalog([
        {
          category: "generation",
          id: "batch-render",
          title: "Batch Render",
        },
        {
          category: "assistant",
          id: "premium-models",
          title: "Premium Models",
        },
      ]).map((descriptor: { id: string }) => descriptor.id),
    ).toEqual([
      "premium-models",
      "batch-render",
    ]);

    expect(
      createSdkworkStarterEntitlementCatalog().map((descriptor: { id: string }) => descriptor.id),
    ).toEqual([
      "smart-chat",
      "premium-models",
      "batch-render",
      "realtime-room",
      "agent-automation",
      "cloud-storage",
    ]);

    const readyDecision = evaluateSdkworkEntitlementDecision(
      {
        category: "assistant",
        description: "General assistant access",
        id: "smart-chat",
        title: "Smart Chat",
      },
      {
        availablePoints: 2400,
        currentLevelValue: 3,
        isAuthenticated: true,
      },
    );
    const upgradeDecision = evaluateSdkworkEntitlementDecision(
      {
        category: "assistant",
        description: "Higher tier model access",
        id: "premium-models",
        minimumLevelValue: 5,
        title: "Premium Models",
      },
      {
        availablePoints: 2400,
        currentLevelValue: 3,
        isAuthenticated: true,
      },
    );
    const rechargeDecision = evaluateSdkworkEntitlementDecision(
      {
        category: "generation",
        description: "Premium render credits",
        id: "batch-render",
        minimumPointsBalance: 5000,
        title: "Batch Render",
      },
      {
        availablePoints: 2400,
        currentLevelValue: 3,
        isAuthenticated: true,
      },
    );
    const limitedDecision = evaluateSdkworkEntitlementDecision(
      {
        category: "generation",
        description: "Usage-heavy workflow",
        id: "realtime-room",
        quotaLimit: 100,
        quotaUsed: 92,
        title: "Realtime Room",
        warningThreshold: 0.9,
      },
      {
        availablePoints: 2400,
        currentLevelValue: 3,
        isAuthenticated: true,
      },
    );

    expect(readyDecision).toMatchObject({
      isAvailable: true,
      isNearLimit: false,
      reasonCodes: [],
      status: "ready",
    });
    expect(upgradeDecision).toMatchObject({
      isAvailable: false,
      reasonCodes: ["minimum-level"],
      recommendedAction: {
        capability: "subscription",
        intent: "upgrade",
        route: "/subscription?mode=upgrade",
      },
      status: "upgrade-required",
    });
    expect(rechargeDecision).toMatchObject({
      isAvailable: false,
      reasonCodes: ["insufficient-points"],
      recommendedAction: {
        capability: "points",
        intent: "recharge",
        route: "/points?section=recharge",
      },
      status: "recharge-required",
    });
    expect(limitedDecision).toMatchObject({
      isAvailable: true,
      isNearLimit: true,
      reasonCodes: ["quota-near-limit"],
      remainingQuota: 8,
      status: "limited",
      usageRatio: 0.92,
    });

    expect(
      summarizeSdkworkEntitlementDecisions([
        readyDecision,
        upgradeDecision,
        rechargeDecision,
        limitedDecision,
      ]),
    ).toEqual({
      attentionCapabilities: 3,
      limitedCapabilities: 1,
      lockedCapabilities: 0,
      readyCapabilities: 1,
      rechargeRequiredCapabilities: 1,
      totalCapabilities: 4,
      upgradeRequiredCapabilities: 1,
    });
  });

  it("localizes entitlement workspace manifest defaults through the copy seam", () => {
    const { createEntitlementWorkspaceManifest } = entitlementModule;

    expect(
      createEntitlementWorkspaceManifest({
        locale: "zh-CN",
        messages: {
          manifest: {
            description: "本地化权益工作区描述",
            title: "本地化权益中心",
          },
        },
      }),
    ).toMatchObject({
      description: "本地化权益工作区描述",
      title: "本地化权益中心",
    });
  });
});
