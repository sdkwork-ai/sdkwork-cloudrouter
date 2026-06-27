import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkSubscriptionIntlProvider,
  SdkworkSubscriptionPage,
  SdkworkSubscriptionSelectedPlanCard,
  createSdkworkSubscriptionController,
} from "../src";

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
    coupons: [],
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
        originalPriceCny: null,
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

describe("sdkwork-commerce-pc-subscription intl", () => {
  it("renders Chinese copy across the subscription page when a Chinese locale is provided", async () => {
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
        <SdkworkSubscriptionPage controller={controller} locale="zh-CN" />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "订阅中心",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续前往结算" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "会员等级" })).toBeInTheDocument();
  });

  it("lets standalone subscription components consume Chinese copy through the intl provider", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionIntlProvider locale="zh-CN">
          <SdkworkSubscriptionSelectedPlanCard selectedPlan={null} />
        </SdkworkSubscriptionIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("未选择套餐")).toBeInTheDocument();
    expect(screen.getByText("选择订阅方案后即可解锁结算。")).toBeInTheDocument();
  });

  it("falls back to built-in English copy for standalone components without a host intl provider", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionSelectedPlanCard selectedPlan={null} />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("No plan selected")).toBeInTheDocument();
    expect(screen.getByText("Choose a subscription plan to unlock checkout.")).toBeInTheDocument();
  });
});
