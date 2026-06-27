import { describe, expect, it, vi } from "vitest";
import { createSdkworkSubscriptionController } from "../src";

function createEmptyDashboard() {
  return {
    benefits: [],
    checkout: {
      action: "purchase" as const,
      discountAmountCny: 0,
      originalAmountCny: 0,
      payableAmountCny: 0,
      selectedCouponId: null,
      selectedPackageId: null,
      selectedPaymentMethodCode: "WECHAT_PAY" as const,
      selectedPaymentMethodId: "wechat-pay",
    },
    coupons: [],
    levels: [],
    paymentMethods: [
      {
        available: true,
        code: "WECHAT_PAY",
        description: "Scan to pay",
        id: "wechat-pay",
        kind: "qr" as const,
        label: "WeChat Pay",
        paymentMethod: "WECHAT" as const,
        productTypes: [
          {
            available: true,
            code: "native" as const,
            label: "Native",
          },
        ],
        recommended: true,
        recommendedProductType: "native" as const,
      },
    ],
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
  };
}

describe("sdkwork-commerce-pc-subscription controller", () => {
  it("bootstraps checkout state, recalculates selections, and refreshes after submit", async () => {
    const firstDashboard = {
      benefits: [],
      checkout: {
        action: "upgrade" as const,
        discountAmountCny: 50,
        originalAmountCny: 199,
        payableAmountCny: 149,
        selectedCouponId: "user-coupon-UC-200",
        selectedPackageId: 2,
        selectedPaymentMethodCode: "WECHAT_PAY" as const,
        selectedPaymentMethodId: "wechat-pay",
      },
      coupons: [
        {
          code: "SPRING50",
          discountAmountCny: 50,
          id: "user-coupon-UC-200",
          minimumSpendCny: 199,
          name: "Spring Launch 50",
          remainingDays: 47,
          status: "available" as const,
        },
        {
          discountAmountCny: 30,
          id: "user-coupon-UC-201",
          minimumSpendCny: 99,
          name: "Starter 30",
          remainingDays: 12,
          status: "available" as const,
        },
      ],
      levels: [],
      paymentMethods: [
        {
          available: true,
          code: "WECHAT_PAY",
          description: "Scan to pay",
          id: "wechat-pay",
          kind: "qr" as const,
          label: "WeChat Pay",
          paymentMethod: "WECHAT" as const,
          productTypes: [
            {
              available: true,
              code: "native" as const,
              label: "Native",
            },
          ],
          recommended: true,
          recommendedProductType: "native" as const,
        },
        {
          available: true,
          code: "ALIPAY",
          description: "Desktop payment",
          id: "alipay-pay",
          kind: "qr" as const,
          label: "Alipay",
          paymentMethod: "ALIPAY" as const,
          productTypes: [
            {
              available: true,
              code: "pc" as const,
              label: "PC Web",
            },
          ],
          recommended: false,
          recommendedProductType: "pc" as const,
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
      checkout: {
        ...firstDashboard.checkout,
        discountAmountCny: 30,
        payableAmountCny: 169,
        selectedCouponId: "user-coupon-UC-201",
        selectedPaymentMethodCode: "ALIPAY" as const,
        selectedPaymentMethodId: "alipay-pay",
      },
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
      getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
      purchaseSubscription: vi.fn(),
      renewSubscription: vi.fn().mockResolvedValue({
        amountCny: 169,
        orderId: "MEMBERSHIP-RENEW-CTRL-1",
        packageId: 2,
        status: "completed",
      }),
      upgradeSubscription: vi.fn(),
    };

    const controller = createSdkworkSubscriptionController({
      service,
    });

    await controller.bootstrap();
    expect(controller.getState()).toMatchObject({
      activeAction: "upgrade",
      activeStage: "plans",
      isBootstrapped: true,
      isLoading: false,
      selectedCouponId: "user-coupon-UC-200",
      selectedPackageId: 2,
      selectedPaymentMethodId: "wechat-pay",
    });

    expect(controller.setStage).toBeTypeOf("function");
    controller.setStage("checkout");
    expect(controller.getState().activeStage).toBe("checkout");

    controller.selectCoupon("user-coupon-UC-201");
    expect(controller.getState().checkout.payableAmountCny).toBe(169);

    controller.selectPaymentMethod("alipay-pay");
    controller.setAction("renew");
    await controller.submitCheckout();

    expect(service.renewSubscription).toHaveBeenCalledWith({
      couponId: "UC-201",
      packageId: 2,
      paymentMethod: "ALIPAY",
    });
    expect(controller.getState().dashboard.summary.remainingDays).toBe(118);
    expect(controller.getState().activeStage).toBe("checkout");
    expect(controller.getState().selectedPaymentMethodId).toBe("alipay-pay");
  });

  it("preserves an explicit no-coupon choice across refresh", async () => {
    const dashboard = {
      benefits: [],
      checkout: {
        action: "upgrade" as const,
        discountAmountCny: 50,
        originalAmountCny: 199,
        payableAmountCny: 149,
        selectedCouponId: "user-coupon-UC-200",
        selectedPackageId: 2,
        selectedPaymentMethodCode: "WECHAT_PAY" as const,
        selectedPaymentMethodId: "wechat-pay",
      },
      coupons: [
        {
          code: "SPRING50",
          discountAmountCny: 50,
          id: "user-coupon-UC-200",
          minimumSpendCny: 199,
          name: "Spring Launch 50",
          remainingDays: 47,
          status: "available" as const,
        },
      ],
      levels: [],
      paymentMethods: [
        {
          available: true,
          code: "WECHAT_PAY",
          description: "Scan to pay",
          id: "wechat-pay",
          kind: "qr" as const,
          label: "WeChat Pay",
          paymentMethod: "WECHAT" as const,
          productTypes: [
            {
              available: true,
              code: "native" as const,
              label: "Native",
            },
          ],
          recommended: true,
          recommendedProductType: "native" as const,
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

    const controller = createSdkworkSubscriptionController({
      service: {
        getDashboard: vi.fn().mockResolvedValue(dashboard),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
        purchaseSubscription: vi.fn(),
        renewSubscription: vi.fn(),
        upgradeSubscription: vi.fn(),
      },
    });

    await controller.bootstrap();
    controller.clearCoupon();

    expect(controller.getState()).toMatchObject({
      couponSelectionMode: "none",
      selectedCouponId: null,
    });
    expect(controller.getState().checkout.discountAmountCny).toBe(0);
    expect(controller.getState().checkout.payableAmountCny).toBe(199);

    await controller.refresh();

    expect(controller.getState()).toMatchObject({
      couponSelectionMode: "none",
      selectedCouponId: null,
    });
    expect(controller.getState().checkout.discountAmountCny).toBe(0);
    expect(controller.getState().checkout.payableAmountCny).toBe(199);
  });

  it("uses host override fallback copy when dashboard bootstrap fails without an Error instance", async () => {
    const controller = createSdkworkSubscriptionController({
      messages: {
        service: {
          loadDashboardFailed: "Host subscription load failed",
        },
      },
      service: {
        getDashboard: vi.fn().mockRejectedValue("boom"),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
        purchaseSubscription: vi.fn(),
        renewSubscription: vi.fn(),
        upgradeSubscription: vi.fn(),
      },
    });

    await expect(controller.bootstrap()).rejects.toBe("boom");
    expect(controller.getState().lastError).toBe("Host subscription load failed");
  });
});
