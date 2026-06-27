import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionCheckoutPanel } from "../src";

describe("sdkwork-commerce-pc-subscription checkout panel", () => {
  it("renders injected payment methods instead of local hardcoded rails", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionCheckoutPanel
          activeAction="upgrade"
          checkout={{
            action: "upgrade",
            discountAmountCny: 50,
            originalAmountCny: 199,
            payableAmountCny: 149,
            selectedCouponId: "user-coupon-UC-200",
            selectedPackageId: 2,
            selectedPaymentMethodCode: "WECHAT_PAY",
            selectedPaymentMethodId: "wechat-pay",
          }}
          coupons={[
            {
              amountCny: 50,
              available: true,
              code: "SPRING50",
              discountAmountCny: 50,
              id: "user-coupon-UC-200",
              minimumSpendCny: 199,
              name: "Spring Launch 50",
              pointCost: null,
              pointsRefunded: false,
              remainingDays: 47,
              status: "available",
              type: "cash",
            },
          ]}
          isAuthenticated
          isMutating={false}
          onClearCoupon={vi.fn()}
          onSelectCoupon={vi.fn()}
          onSelectPaymentMethod={vi.fn()}
          onSubmit={vi.fn()}
          paymentMethods={[
            {
              available: true,
              code: "WECHAT_PAY",
              description: "Scan to pay",
              id: "wechat-pay",
              kind: "qr",
              label: "WeChat Pay",
              paymentMethod: "WECHAT",
              productTypes: [
                {
                  available: true,
                  code: "native",
                  label: "Native",
                },
              ],
              recommended: true,
              recommendedProductType: "native",
            },
          ]}
          selectedCouponId="user-coupon-UC-200"
          selectedPlan={{
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
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: /wechat pay/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alipay")).not.toBeInTheDocument();

    const checkoutPanel = screen.getByRole("heading", {
      level: 2,
      name: /checkout summary/i,
    }).closest("aside");
    expect(checkoutPanel).not.toBeNull();
    expect(checkoutPanel?.className).toContain("shadow-[var(--sdk-shadow-md)]");
    expect(checkoutPanel?.className).not.toContain("shadow-[0_18px_48px_rgba");
  });
});
