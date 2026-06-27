import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionPage, createSdkworkSubscriptionController } from "../src";

function createSubscriptionDashboard() {
  return {
    benefits: [
      {
        claimed: true,
        id: "membership-benefit-2",
        name: "Priority rendering",
        usageLimit: 10,
        usedCount: 2,
      },
    ],
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
}

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

describe("sdkwork-commerce-pc-subscription page", () => {
  it("renders the reusable subscription center with staged plan selection and checkout", async () => {
    const controller = createSdkworkSubscriptionController({
      service: {
        getDashboard: vi.fn().mockResolvedValue(createSubscriptionDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
        purchaseSubscription: vi.fn(),
        renewSubscription: vi.fn(),
        upgradeSubscription: vi.fn(),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPage controller={controller} />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /subscription center/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /continue to checkout/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/free membership/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ready to continue/i)).toBeInTheDocument();
    expect(screen.getByText("Priority rendering")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /continue to checkout/i,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /back to plans/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /confirm payment/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Spring Launch 50")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /wechat pay/i,
      }),
    ).toBeInTheDocument();
  });

  it("forwards successful checkout results to the host callback", async () => {
    const dashboard = createSubscriptionDashboard();
    const onCheckoutComplete = vi.fn();
    const onCheckoutError = vi.fn();
    const controller = createSdkworkSubscriptionController({
      service: {
        getDashboard: vi
          .fn()
          .mockResolvedValueOnce(dashboard)
          .mockResolvedValueOnce(dashboard),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
        purchaseSubscription: vi.fn(),
        renewSubscription: vi.fn(),
        upgradeSubscription: vi.fn().mockResolvedValue({
          amountCny: 149,
          orderId: "MEMBERSHIP-ORDER-200",
          packageId: 2,
          status: "completed",
        }),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPage
          controller={controller}
          onCheckoutComplete={onCheckoutComplete}
          onCheckoutError={onCheckoutError}
        />
      </SdkworkThemeProvider>,
    );

    await screen.findByRole("heading", {
      name: /subscription center/i,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /continue to checkout/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /confirm payment/i,
      }),
    );

    await waitFor(() => {
      expect(onCheckoutComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCny: 149,
          orderId: "MEMBERSHIP-ORDER-200",
          packageId: 2,
          status: "completed",
        }),
      );
    });
    expect(onCheckoutError).not.toHaveBeenCalled();
  });

  it("captures checkout errors and forwards them to the host callback", async () => {
    const dashboard = createSubscriptionDashboard();
    const failure = new Error("Subscription checkout failed hard.");
    const onCheckoutComplete = vi.fn();
    const onCheckoutError = vi.fn();
    const controller = createSdkworkSubscriptionController({
      service: {
        getDashboard: vi.fn().mockResolvedValue(dashboard),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
        purchaseSubscription: vi.fn(),
        renewSubscription: vi.fn(),
        upgradeSubscription: vi.fn().mockRejectedValue(failure),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPage
          controller={controller}
          onCheckoutComplete={onCheckoutComplete}
          onCheckoutError={onCheckoutError}
        />
      </SdkworkThemeProvider>,
    );

    await screen.findByRole("heading", {
      name: /subscription center/i,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /continue to checkout/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /confirm payment/i,
      }),
    );

    await waitFor(() => {
      expect(onCheckoutError).toHaveBeenCalledWith(failure);
    });
    expect(onCheckoutComplete).not.toHaveBeenCalled();
  });

  it("passes host message overrides through the page-created controller seam", async () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPage
          messages={{
            page: {
              errorTitle: "Host subscription issue",
            },
            service: {
              loadDashboardFailed: "Host dashboard failed",
            },
          }}
          service={{
            getDashboard: vi.fn().mockRejectedValue("boom"),
            getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
            purchaseSubscription: vi.fn(),
            renewSubscription: vi.fn(),
            upgradeSubscription: vi.fn(),
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(await screen.findByText("Host subscription issue")).toBeInTheDocument();
    expect(screen.getByText("Host dashboard failed")).toBeInTheDocument();
  });
});
