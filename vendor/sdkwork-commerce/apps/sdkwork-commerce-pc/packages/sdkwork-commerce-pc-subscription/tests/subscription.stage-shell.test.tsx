import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionStageShell } from "../src/components/subscription-stage-shell";

const selectedPlan = {
  description: "Best for professional creators.",
  durationDays: 30,
  id: "membership-plan-2",
  includedPoints: 5000,
  name: "Pro Monthly",
  originalPriceCny: null,
  packageId: 2,
  priceCny: 199,
  recommended: true,
  tags: ["Popular", "Creator"],
};

const checkout = {
  action: "upgrade" as const,
  discountAmountCny: 50,
  originalAmountCny: 199,
  payableAmountCny: 149,
  selectedCouponId: "user-coupon-UC-200",
  selectedPackageId: 2,
  selectedPaymentMethodCode: "WECHAT_PAY" as const,
  selectedPaymentMethodId: "wechat-pay",
};

const summary = {
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
};

describe("sdkwork-commerce-pc-subscription stage shell", () => {
  it("renders the plan stage readiness rail with a continue action", () => {
    const onContinueToCheckout = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionStageShell
          activeAction="upgrade"
          activeStage="plans"
          checkout={checkout}
          couponCount={2}
          isAuthenticated
          onBackToPlans={vi.fn()}
          onContinueToCheckout={onContinueToCheckout}
          paymentContent={<div>Payment content</div>}
          planContent={<div>Plan content</div>}
          planCount={3}
          selectedPlan={selectedPlan}
          summary={summary}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/purchase stages/i)).toBeInTheDocument();
    expect(screen.getByText(/ready to continue/i)).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();

    const shellPanel = screen.getByText(/purchase stages/i).closest("section")?.firstElementChild;
    expect(shellPanel).not.toBeNull();
    expect(shellPanel?.className).toContain("shadow-[var(--sdk-shadow-md)]");
    expect(shellPanel?.className).not.toContain("shadow-[0_18px_48px_rgba");

    fireEvent.click(
      screen.getByRole("button", {
        name: /continue to checkout/i,
      }),
    );

    expect(onContinueToCheckout).toHaveBeenCalledTimes(1);
  });

  it("renders the locked checkout stage with a back action", () => {
    const onBackToPlans = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionStageShell
          activeAction="upgrade"
          activeStage="checkout"
          checkout={checkout}
          couponCount={2}
          isAuthenticated
          onBackToPlans={onBackToPlans}
          onContinueToCheckout={vi.fn()}
          paymentContent={<div>Payment content</div>}
          planContent={<div>Plan content</div>}
          planCount={3}
          selectedPlan={selectedPlan}
          summary={summary}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getAllByText(/locked package/i)).toHaveLength(2);
    expect(screen.getByText(/payment content/i)).toBeInTheDocument();

    const lockedCheckoutPanel = screen.getAllByText(/locked package/i)[0]?.closest("section");
    expect(lockedCheckoutPanel).not.toBeNull();
    expect(lockedCheckoutPanel?.className).toContain("shadow-[var(--sdk-shadow-md)]");
    expect(lockedCheckoutPanel?.className).not.toContain("shadow-[0_18px_48px_rgba");

    fireEvent.click(
      screen.getByRole("button", {
        name: /back to plans/i,
      }),
    );

    expect(onBackToPlans).toHaveBeenCalledTimes(1);
  });
});
