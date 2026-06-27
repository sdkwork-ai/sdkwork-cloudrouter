import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionCouponList } from "../src";

describe("sdkwork-commerce-pc-subscription coupon list", () => {
  it("renders tokenized coupon cards and reusable coupon code badges", () => {
    const onSelectCoupon = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionCouponList
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
          onClearCoupon={vi.fn()}
          onSelectCoupon={onSelectCoupon}
          selectedCouponId="user-coupon-UC-200"
        />
      </SdkworkThemeProvider>,
    );

    const couponCard = screen.getByRole("button", {
      name: /spring launch 50/i,
    });
    expect(couponCard.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(couponCard.className).not.toContain("shadow-[0_12px_28px_rgba");

    const codeBadge = screen.getByText("SPRING50");
    expect(codeBadge.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(codeBadge.className).not.toContain("bg-white");

    fireEvent.click(couponCard);
    expect(onSelectCoupon).toHaveBeenCalledWith("user-coupon-UC-200");
  });
});
