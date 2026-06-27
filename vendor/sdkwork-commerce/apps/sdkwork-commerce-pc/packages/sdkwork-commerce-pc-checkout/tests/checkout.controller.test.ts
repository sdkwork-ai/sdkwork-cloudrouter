import { describe, expect, it, vi } from "vitest";
import { createSdkworkCheckoutController } from "../src";

function createCatalog() {
  return {
    invoicePolicy: {
      available: true,
      enabledByDefault: true,
      title: "SDKWORK Technology",
      titleType: "company",
    },
    isAuthenticated: true,
    paymentMethods: [
      {
        available: true,
        code: "WECHAT_PAY",
        id: "wechat-pay",
        kind: "qr",
        label: "WeChat Pay",
        recommended: true,
      },
      {
        available: true,
        code: "ALIPAY",
        id: "alipay-pay",
        kind: "qr",
        label: "Alipay",
        recommended: false,
      },
    ],
    sources: [
      {
        action: {
          capability: "subscription",
          intent: "purchase",
          label: "Activate membership",
          route: "/subscription?mode=purchase&packageId=101",
        },
        billingLabel: "Monthly",
        description: "Premium plan",
        id: "plan-pro",
        invoiceEligible: true,
        kind: "subscription",
        meta: {
          action: "purchase",
          packageId: 101,
        },
        originalAmountCny: 59,
        quantity: 1,
        recommended: true,
        tags: ["creator"],
        title: "Pro Monthly",
        unitLabel: "seat",
      },
      {
        action: {
          capability: "wallet",
          intent: "recharge",
          label: "Recharge wallet",
          route: "/wallet?section=recharge",
        },
        billingLabel: "One-time recharge",
        description: "Wallet recharge package",
        id: "wallet-pack-12000",
        invoiceEligible: false,
        kind: "wallet-recharge",
        meta: {
          points: 12000,
        },
        originalAmountCny: 99,
        quantity: 12000,
        recommended: false,
        tags: ["credits"],
        title: "Studio Credits 12K",
        unitLabel: "points",
      },
    ],
    userCoupons: [
      {
        discountAmountCny: 30,
        id: "user-coupon-subscription",
        label: "Launch Credit",
        minimumSpendCny: 50,
        sourceKinds: ["subscription"],
      },
      {
        discountAmountCny: 12,
        id: "user-coupon-wallet",
        label: "Recharge Coupon",
        minimumSpendCny: 80,
        sourceKinds: ["wallet-recharge"],
      },
    ],
    walletBalanceCny: 18,
  };
}

describe("sdkwork-commerce-pc-checkout controller", () => {
  it("bootstraps checkout data, normalizes source-specific state, and submits the active session", async () => {
    const service = {
      getCatalog: vi.fn().mockResolvedValue(createCatalog()),
      getEmptyCatalog: vi.fn().mockReturnValue({
        ...createCatalog(),
        invoicePolicy: {
          available: false,
          enabledByDefault: false,
          title: undefined,
          titleType: "personal",
        },
        isAuthenticated: false,
        paymentMethods: [],
        sources: [],
        userCoupons: [],
        walletBalanceCny: 0,
      }),
      submitCheckout: vi.fn().mockResolvedValue({
        amountCny: 29,
        nextRoute: "/payments?paymentId=PAY-9001&orderId=ORDER-9001",
        orderId: "ORDER-9001",
        paymentId: "PAY-9001",
        status: "requires-payment",
      }),
    };

    const controller = createSdkworkCheckoutController({
      service,
    });

    expect(controller.getState().catalog.sources).toEqual([]);
    expect(controller.getState().session.source).toBeNull();

    await controller.bootstrap();

    expect(controller.getState().selectedSourceId).toBe("plan-pro");
    expect(controller.getState().selectedCouponId).toBe("user-coupon-subscription");
    expect(controller.getState().invoiceRequested).toBe(true);

    controller.selectPaymentMethod("alipay-pay");
    expect(controller.getState().selectedPaymentMethodId).toBe("alipay-pay");

    controller.toggleInvoiceRequested(false);
    expect(controller.getState().invoiceRequested).toBe(false);

    controller.selectSource("wallet-pack-12000");
    expect(controller.getState().selectedSourceId).toBe("wallet-pack-12000");
    expect(controller.getState().selectedCouponId).toBe("user-coupon-wallet");
    expect(controller.getState().invoiceRequested).toBe(false);

    controller.selectCoupon(null);
    expect(controller.getState().selectedCouponId).toBeNull();
    expect(controller.getState().session.summary.discountAmountCny).toBe(0);

    controller.selectSource("plan-pro");
    expect(controller.getState().selectedCouponId).toBe("user-coupon-subscription");

    await controller.submitCheckout();

    expect(service.submitCheckout).toHaveBeenCalledWith({
      invoiceRequested: false,
      selectedCouponId: "user-coupon-subscription",
      selectedPaymentMethodId: "alipay-pay",
      sourceId: "plan-pro",
    });
    expect(controller.getState().lastSubmission).toMatchObject({
      paymentId: "PAY-9001",
      status: "requires-payment",
    });
  });

  it("uses localized controller fallback messages for zh-CN", async () => {
    const bootstrapService = {
      getCatalog: vi.fn().mockRejectedValue("network-timeout"),
      getEmptyCatalog: vi.fn().mockReturnValue({
        ...createCatalog(),
        isAuthenticated: false,
        paymentMethods: [],
        sources: [],
        userCoupons: [],
        walletBalanceCny: 0,
      }),
      submitCheckout: vi.fn(),
    };

    const bootstrapController = createSdkworkCheckoutController({
      locale: "zh-CN",
      service: bootstrapService,
    });

    await expect(bootstrapController.bootstrap()).rejects.toBe("network-timeout");
    expect(bootstrapController.getState().lastError).toBe("\u52a0\u8f7d\u7ed3\u7b97\u4e2d\u5fc3\u5931\u8d25\u3002");

    await expect(bootstrapController.submitCheckout()).rejects.toThrow(
      "\u5f53\u524d\u672a\u9009\u62e9\u53ef\u7ed3\u7b97\u6765\u6e90\u3002",
    );

    const submitService = {
      getCatalog: vi.fn().mockResolvedValue(createCatalog()),
      getEmptyCatalog: vi.fn().mockReturnValue({
        ...createCatalog(),
        isAuthenticated: false,
        paymentMethods: [],
        sources: [],
        userCoupons: [],
        walletBalanceCny: 0,
      }),
      submitCheckout: vi.fn().mockRejectedValue("submit-timeout"),
    };

    const submitController = createSdkworkCheckoutController({
      locale: "zh-CN",
      service: submitService,
    });

    await submitController.bootstrap();
    await expect(submitController.submitCheckout()).rejects.toBe("submit-timeout");
    expect(submitController.getState().lastError).toBe("\u63d0\u4ea4\u7ed3\u7b97\u5931\u8d25\u3002");
  });
});
