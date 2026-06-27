import { describe, expect, it } from "vitest";
import {
  createSdkworkMembershipPurchaseService,
  createMembershipPurchaseRouteIntent,
  createMembershipPurchaseWorkspaceManifest,
  resolveSdkworkMembershipPurchaseMode,
  membershipPurchasePackageMeta,
} from "../src";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import { vi } from "vitest";

describe("sdkwork-commerce-pc-membership-purchase headless contract", () => {
  it("creates independent membership purchase manifests, route intents, and purchase mode decisions", () => {
    expect(membershipPurchasePackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-membership-purchase",
    });

    expect(createMembershipPurchaseWorkspaceManifest()).toMatchObject({
      capability: "membership-purchase",
      packageNames: ["@sdkwork/commerce-pc-membership-purchase", "@sdkwork/commerce-pc-membership"],
      routePath: "/memberships/purchase",
      title: "Membership Purchase",
    });

    expect(createMembershipPurchaseRouteIntent({
      mode: "purchase",
      packageId: 2,
    })).toEqual({
      focusWindow: true,
      mode: "purchase",
      packageId: 2,
      route: "/memberships/purchase?mode=purchase&packageId=2",
      source: "membership-purchase-workspace",
      type: "membership-purchase-route-intent",
    });

    expect(resolveSdkworkMembershipPurchaseMode({
      summary: {
        isMember: false,
        remainingDays: null,
      },
    })).toBe("purchase");
    expect(resolveSdkworkMembershipPurchaseMode({
      plan: {
        durationDays: 365,
        packageId: 3,
      },
      summary: {
        isMember: true,
        remainingDays: 20,
      },
    })).toBe("renew");
    expect(resolveSdkworkMembershipPurchaseMode({
      plan: {
        durationDays: 365,
        packageId: 3,
      },
      summary: {
        isMember: true,
        remainingDays: 180,
      },
    })).toBe("upgrade");
  });

  it("submits package purchase, renewal, and upgrade through the membership purchase service boundary", async () => {
    configureCommerceServiceMockSession({ authToken: "membership-purchase-auth-token" });
    const purchase = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: "199.00",
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
        orderId: "MEMBERSHIP-RENEW-3",
        packageId: 3,
        packageName: "Pro Annual",
        status: "SUCCESS",
        targetLevelName: "Pro",
      },
    });
    const upgrade = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: 99,
        durationDays: 30,
        orderId: "MEMBERSHIP-UPGRADE-4",
        packageId: 4,
        packageName: "Team Plus",
        status: "PENDING",
        targetLevelName: "Team",
      },
    });
    const service = createSdkworkMembershipPurchaseService({
      commerceService: createCommerceServiceMock({
        memberships: {
          purchases: {
            create: purchase,
            renew,
            upgrade,
          },
        },
      }),
    });

    await expect(
      service.submitPackagePurchase({
        packageId: 2,
        paymentMethod: "WECHAT",
        summary: {
          isMember: false,
          remainingDays: null,
        },
      }),
    ).resolves.toMatchObject({
      amountCny: 199,
      mode: "purchase",
      orderId: "MEMBERSHIP-PURCHASE-2",
      packageId: 2,
      status: "completed",
    });
    await expect(
      service.submitPackagePurchase({
        packageId: 3,
        paymentMethod: "ALIPAY",
        plan: {
          durationDays: 365,
          packageId: 3,
        },
        summary: {
          isMember: true,
          remainingDays: 20,
        },
      }),
    ).resolves.toMatchObject({
      mode: "renew",
      orderId: "MEMBERSHIP-RENEW-3",
      packageId: 3,
      status: "completed",
    });
    await expect(
      service.submitPackagePurchase({
        packageId: 4,
        paymentMethod: "WECHAT",
        plan: {
          durationDays: 365,
          packageId: 4,
        },
        summary: {
          isMember: true,
          remainingDays: 180,
        },
      }),
    ).resolves.toMatchObject({
      mode: "upgrade",
      orderId: "MEMBERSHIP-UPGRADE-4",
      packageId: 4,
      status: "pending",
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
    expect(upgrade).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 4,
      paymentMethod: "WECHAT",
    });

    resetCommerceServiceMockSession();
  });

  it("keeps the package purchase submit method safe when passed as a callback", async () => {
    configureCommerceServiceMockSession({ authToken: "membership-purchase-auth-token" });
    const purchase = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        amount: 199,
        orderId: "MEMBERSHIP-PURCHASE-CALLBACK-1",
        packageId: 2,
        status: "SUCCESS",
      },
    });
    const service = createSdkworkMembershipPurchaseService({
      commerceService: createCommerceServiceMock({
        memberships: {
          purchases: {
            create: purchase,
          },
        },
      }),
    });
    const { submitPackagePurchase } = service;

    await expect(
      submitPackagePurchase({
        packageId: 2,
        summary: {
          isMember: false,
          remainingDays: null,
        },
      }),
    ).resolves.toMatchObject({
      mode: "purchase",
      orderId: "MEMBERSHIP-PURCHASE-CALLBACK-1",
    });

    expect(purchase).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 2,
      paymentMethod: undefined,
    });
    resetCommerceServiceMockSession();
  });
});
