import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import { createSdkworkSubscriptionService } from "../src";

describe("sdkwork-commerce-pc-subscription service", () => {
  const RETIRED_TIER_ROOT = "v" + "ip";

  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "subscription-auth-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("does not retain legacy tier mutation operation labels in the subscription service implementation", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-subscription/src/subscription-service.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain('"' + RETIRED_TIER_ROOT + '.purchase"');
    expect(source).not.toContain('"' + RETIRED_TIER_ROOT + '.renew"');
    expect(source).not.toContain('"' + RETIRED_TIER_ROOT + '.upgrade"');
    expect(source).toContain('"memberships.purchase"');
    expect(source).toContain('"memberships.renew"');
    expect(source).toContain('"memberships.upgrade"');
  });

  it("maps membership dashboard data and checkout-ready coupons into a reusable subscription dashboard", async () => {
    const commerceService = createCommerceServiceMock({
      promotions: {
        userCoupons: {
          wallet: {
            list: vi.fn().mockResolvedValue({
              code: "2000",
              data: {
                content: [
                  {
                    amount: 50,
                    available: true,
                    couponCode: "SPRING50",
                    couponId: "200",
                    couponName: "Spring Launch 50",
                    discount: undefined,
                    expireAt: "2026-05-20T00:00:00.000Z",
                    minConsume: 199,
                    remainingDays: 47,
                    status: "UNUSED",
                    statusName: "Available",
                    type: "CASH",
                    userCouponId: "UC-200",
                  },
                  {
                    amount: undefined,
                    available: true,
                    couponCode: "YEAR85",
                    couponId: "201",
                    couponName: "Yearly 8.5 Discount",
                    discount: 8.5,
                    expireAt: "2026-07-01T00:00:00.000Z",
                    minConsume: 300,
                    remainingDays: 89,
                    status: "UNUSED",
                    statusName: "Available",
                    type: "DISCOUNT",
                    userCouponId: "UC-201",
                  },
                ],
                totalElements: 2,
              },
            }),
          },
        },
      },
    });

    const service = createSdkworkSubscriptionService({
      commerceService,
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
          methods: [
            {
              available: true,
              code: "WECHAT_PAY",
              icon: "https://cdn.sdkwork.ai/icons/wechat.png",
              id: "wechat-pay",
              label: "WeChat Pay",
              productTypes: [
                {
                  available: true,
                  code: "native",
                  label: "Native",
                },
              ],
              recommendedProductType: "native",
              sort: 100,
            },
            {
              available: true,
              code: "ALIPAY",
              icon: "https://cdn.sdkwork.ai/icons/alipay.png",
              id: "alipay-pay",
              label: "Alipay",
              productTypes: [
                {
                  available: true,
                  code: "pc",
                  label: "PC Web",
                },
              ],
              recommendedProductType: "pc",
              sort: 90,
            },
            {
              available: true,
              code: "UNION_PAY",
              icon: "https://cdn.sdkwork.ai/icons/union-pay.png",
              id: "union-pay",
              label: "UnionPay",
              productTypes: [
                {
                  available: true,
                  code: "pc",
                  label: "PC Web",
                },
              ],
              recommendedProductType: "pc",
              sort: 80,
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
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
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
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [
            {
              claimed: true,
              id: "membership-benefit-2",
              name: "Priority rendering",
              usageLimit: 10,
              usedCount: 2,
            },
          ],
          levels: [
            {
              id: "membership-level-3",
              isCurrent: true,
              levelValue: 3,
              name: "Pro",
              requiredPoints: 500,
            },
          ],
          plans: [
            {
              description: "Best for professional creators.",
              durationDays: 30,
              id: "membership-plan-2",
              includedPoints: 5000,
              name: "Pro Monthly",
              packageId: 2,
              priceCny: 199,
              recommended: true,
              tags: ["Popular"],
            },
            {
              description: "Best for annual savings.",
              durationDays: 365,
              id: "membership-plan-3",
              includedPoints: 60000,
              name: "Pro Annual",
              packageId: 3,
              priceCny: 699,
              recommended: false,
              tags: ["Annual"],
            },
          ],
          summary: {
            currentLevelName: "Pro",
            currentLevelValue: 3,
            expireTime: "2026-06-30T00:00:00.000Z",
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
        }),
        getEmptyDashboard: vi.fn(),
        purchaseMembership: vi.fn(),
        renewMembership: vi.fn(),
        upgradeMembership: vi.fn(),
      },
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.summary).toMatchObject({
      currentLevelName: "Pro",
      isAuthenticated: true,
      isMember: true,
      remainingDays: 88,
      status: "active",
    });
    expect(dashboard.plans[0]).toMatchObject({
      name: "Pro Monthly",
      packageId: 2,
      recommended: true,
    });
    expect(dashboard.coupons[0]).toMatchObject({
      code: "SPRING50",
      discountAmountCny: 50,
      id: "user-coupon-UC-200",
      minimumSpendCny: 199,
      name: "Spring Launch 50",
      status: "available",
      type: "cash",
    });
    expect(dashboard.paymentMethods).toEqual([
      expect.objectContaining({
        code: "WECHAT_PAY",
        id: "wechat-pay",
        kind: "qr",
        label: "WeChat Pay",
        paymentMethod: "WECHAT",
        recommended: true,
        recommendedProductType: "native",
      }),
      expect.objectContaining({
        code: "ALIPAY",
        id: "alipay-pay",
        kind: "other",
        label: "Alipay",
        paymentMethod: "ALIPAY",
        recommended: false,
        recommendedProductType: "pc",
      }),
    ]);
    expect(dashboard.checkout).toMatchObject({
      action: "upgrade",
      discountAmountCny: 50,
      originalAmountCny: 199,
      payableAmountCny: 149,
      selectedCouponId: "user-coupon-UC-200",
      selectedPackageId: 2,
      selectedPaymentMethodCode: "WECHAT_PAY",
      selectedPaymentMethodId: "wechat-pay",
    });
  });

  it("returns a guest-safe subscription dashboard when the current membership is anonymous", async () => {
    const service = createSdkworkSubscriptionService({
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
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
        getEmptyDashboard: vi.fn(),
        purchaseMembership: vi.fn(),
        renewMembership: vi.fn(),
        upgradeMembership: vi.fn(),
      },
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.summary.status).toBe("guest");
    expect(dashboard.coupons).toEqual([]);
    expect(dashboard.checkout).toMatchObject({
      action: "purchase",
      discountAmountCny: 0,
      payableAmountCny: 0,
      selectedCouponId: null,
      selectedPackageId: null,
    });
  });

  it("delegates purchase, renew, and upgrade actions to the membership service boundary", async () => {
    const purchaseMembership = vi.fn().mockResolvedValue({
      amountCny: 199,
      durationDays: 30,
      orderId: "MEMBERSHIP-PURCHASE-1",
      packageId: 2,
      packageName: "Pro Monthly",
      status: "completed",
      targetLevelName: "Pro",
    });
    const renewMembership = vi.fn().mockResolvedValue({
      amountCny: 699,
      durationDays: 365,
      orderId: "MEMBERSHIP-RENEW-1",
      packageId: 3,
      packageName: "Pro Annual",
      status: "completed",
      targetLevelName: "Pro",
    });
    const upgradeMembership = vi.fn().mockResolvedValue({
      amountCny: 199,
      durationDays: 30,
      orderId: "MEMBERSHIP-UPGRADE-1",
      packageId: 2,
      packageName: "Pro Monthly",
      status: "completed",
      targetLevelName: "Pro",
    });
    const service = createSdkworkSubscriptionService({
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [],
          levels: [],
          plans: [],
          summary: {
            currentLevelName: "Free",
            currentLevelValue: 1,
            growthValue: 20,
            isAuthenticated: true,
            isMember: false,
            pointBalance: 100,
            remainingDays: null,
            status: "free" as const,
            totalSpent: 0,
            upgradeGrowthValue: 200,
            points: 20,
          },
        }),
        getEmptyDashboard: vi.fn(),
        purchaseMembership,
        renewMembership,
        upgradeMembership,
      },
    });

    await expect(
      service.purchaseSubscription({
        couponId: "UC-200",
        packageId: 2,
        paymentMethod: "ALIPAY",
      }),
    ).resolves.toMatchObject({
      amountCny: 199,
      orderId: "MEMBERSHIP-PURCHASE-1",
      packageId: 2,
      status: "completed",
    });

    await expect(
      service.renewSubscription({
        packageId: 3,
        paymentMethod: "WECHAT",
      }),
    ).resolves.toMatchObject({
      amountCny: 699,
      orderId: "MEMBERSHIP-RENEW-1",
      packageId: 3,
      status: "completed",
    });

    await expect(
      service.upgradeSubscription({
        couponId: "UC-200",
        packageId: 2,
        paymentMethod: "WECHAT",
      }),
    ).resolves.toMatchObject({
      amountCny: 199,
      orderId: "MEMBERSHIP-UPGRADE-1",
      packageId: 2,
      status: "completed",
    });

    expect(purchaseMembership).toHaveBeenCalledWith({
      couponId: "UC-200",
      packageId: 2,
      paymentMethod: "ALIPAY",
    });
    expect(renewMembership).toHaveBeenCalledWith({
      couponId: undefined,
      packageId: 3,
      paymentMethod: "WECHAT",
    });
    expect(upgradeMembership).toHaveBeenCalledWith({
      couponId: "UC-200",
      packageId: 2,
      paymentMethod: "WECHAT",
    });
  });

  it("localizes auth at subscription entry and uses membership-owned mutation fallback errors", async () => {
    resetCommerceServiceMockSession();
    const localizedAuthService = createSdkworkSubscriptionService({
      locale: "zh-CN",
    });

    await expect(
      localizedAuthService.purchaseSubscription({
        packageId: 2,
      }),
    ).rejects.toThrow("请先登录后再管理订阅。");

    configureCommerceServiceMockSession({ authToken: "subscription-auth-token" });
    const localizedMutationService = createSdkworkSubscriptionService({
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
    });

    await expect(
      localizedMutationService.purchaseSubscription({
        packageId: 2,
      }),
    ).rejects.toThrow("购买会员失败。");
  });
});
